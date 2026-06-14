import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Document, Page, pdfjs } from "react-pdf"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

const SIGNATURE_WIDTH = 0.25
const SIGNATURE_HEIGHT = 0.08

function DocumentPreview() {
  const { id } = useParams()
  const navigate = useNavigate()

  const pdfAreaRef = useRef(null)
  const signatureCanvasRef = useRef(null)

  const [documentDetails, setDocumentDetails] = useState(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [savedSignatures, setSavedSignatures] = useState([])
  const [signatureContents, setSignatureContents] = useState({})
  const [signatureText, setSignatureText] = useState("")
  const [drawnSignature, setDrawnSignature] = useState("")

  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSignature, setIsSavingSignature] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const [dragItem, setDragItem] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)

  useEffect(() => {
    const savedTypedSignature = localStorage.getItem("signifypdf_typed_signature")

    if (savedTypedSignature) {
      setSignatureText(savedTypedSignature)
    }

    const savedDrawnSignature = localStorage.getItem("signifypdf_drawn_signature")

    if (savedDrawnSignature) {
      setDrawnSignature(savedDrawnSignature)
    }

    const savedContents = localStorage.getItem(`signifypdf_signature_texts_${id}`)

    if (savedContents) {
      setSignatureContents(JSON.parse(savedContents))
    }
  }, [id])

  useEffect(() => {
    localStorage.setItem("signifypdf_typed_signature", signatureText)
  }, [signatureText])

  useEffect(() => {
    if (drawnSignature) {
      localStorage.setItem("signifypdf_drawn_signature", drawnSignature)
    } else {
      localStorage.removeItem("signifypdf_drawn_signature")
    }
  }, [drawnSignature])

  useEffect(() => {
    localStorage.setItem(
      `signifypdf_signature_texts_${id}`,
      JSON.stringify(signatureContents)
    )
  }, [signatureContents, id])

  useEffect(() => {
    const canvas = signatureCanvasRef.current

    if (!canvas || !drawnSignature) {
      return
    }

    const context = canvas.getContext("2d")
    const image = new Image()

    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }

    image.src = drawnSignature
  }, [drawnSignature])

  useEffect(() => {
    let temporaryPdfUrl = ""

    async function loadDocumentPreview() {
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/login")
        return
      }

      try {
        const detailsResponse = await fetch(`http://127.0.0.1:8000/api/docs/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const detailsData = await detailsResponse.json()

        if (!detailsResponse.ok) {
          setMessage(detailsData.detail || "Document not found")
          setIsLoading(false)
          return
        }

        setDocumentDetails(detailsData)

        const signaturesResponse = await fetch(`http://127.0.0.1:8000/api/signatures/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const signaturesData = await signaturesResponse.json()

        if (signaturesResponse.ok) {
          setSavedSignatures(signaturesData)
        }

        const fileResponse = await fetch(`http://127.0.0.1:8000/api/docs/${id}/file`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!fileResponse.ok) {
          setMessage("Could not load PDF file")
          setIsLoading(false)
          return
        }

        const pdfBlob = await fileResponse.blob()
        temporaryPdfUrl = URL.createObjectURL(pdfBlob)

        setPdfUrl(temporaryPdfUrl)
      } catch (error) {
        setMessage("Backend is not running or something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    loadDocumentPreview()

    return () => {
      if (temporaryPdfUrl) {
        URL.revokeObjectURL(temporaryPdfUrl)
      }
    }
  }, [id, navigate])

  useEffect(() => {
    if (!dragItem) {
      return
    }

    function handleMouseMove(event) {
      setDragPreview({
        x: event.clientX,
        y: event.clientY,
        content: dragItem.content
      })
    }

    async function handleMouseUp(event) {
      const pdfArea = pdfAreaRef.current

      if (!pdfArea) {
        setDragItem(null)
        setDragPreview(null)
        return
      }

      const pdfBox = pdfArea.getBoundingClientRect()

      const isInsidePdf =
        event.clientX >= pdfBox.left &&
        event.clientX <= pdfBox.right &&
        event.clientY >= pdfBox.top &&
        event.clientY <= pdfBox.bottom

      if (!isInsidePdf) {
        setMessage("Drop the signature inside the PDF area")
        setDragItem(null)
        setDragPreview(null)
        return
      }

      const position = calculateSignaturePosition(
        event.clientX,
        event.clientY,
        dragItem.width,
        dragItem.height,
        pdfBox
      )

      if (dragItem.type === "new") {
        const signatureData = {
          document_id: Number(id),
          page_number: pageNumber,
          x_position: position.x_position,
          y_position: position.y_position,
          width: dragItem.width,
          height: dragItem.height
        }

        await saveSignaturePosition(signatureData, dragItem.content)
      }

      if (dragItem.type === "move") {
        const updatedSignatureData = {
          page_number: pageNumber,
          x_position: position.x_position,
          y_position: position.y_position,
          width: dragItem.width,
          height: dragItem.height
        }

        await updateSignaturePosition(dragItem.signatureId, updatedSignatureData)
      }

      setDragItem(null)
      setDragPreview(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragItem, id, pageNumber])

  function handleDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  function goToPreviousPage() {
    setPageNumber((prevPage) => Math.max(prevPage - 1, 1))
  }

  function goToNextPage() {
    setPageNumber((prevPage) => Math.min(prevPage + 1, numPages))
  }

  function calculateSignaturePosition(clientX, clientY, signatureWidth, signatureHeight, pdfBox) {
    const rawX = (clientX - pdfBox.left) / pdfBox.width
    const rawY = (clientY - pdfBox.top) / pdfBox.height

    const finalX = Math.min(
      Math.max(rawX - signatureWidth / 2, 0),
      1 - signatureWidth
    )

    const finalY = Math.min(
      Math.max(rawY - signatureHeight / 2, 0),
      1 - signatureHeight
    )

    return {
      x_position: Number(finalX.toFixed(4)),
      y_position: Number(finalY.toFixed(4))
    }
  }

  function getCleanSignatureText() {
    const cleanText = signatureText.trim()

    if (!cleanText) {
      return "Signature"
    }

    return cleanText
  }

  function getTypedSignatureContent() {
    return {
      type: "text",
      value: getCleanSignatureText()
    }
  }

  function getDrawnSignatureContent() {
    return {
      type: "image",
      value: drawnSignature
    }
  }

  function startNewSignatureDrag(event, signatureContent) {
    event.preventDefault()

    if (signatureContent.type === "image" && !signatureContent.value) {
      setMessage("Please draw your signature first")
      return
    }

    setDragItem({
      type: "new",
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT,
      content: signatureContent
    })

    setDragPreview({
      x: event.clientX,
      y: event.clientY,
      content: signatureContent
    })

    setMessage("Drag and release the signature on the PDF")
  }

  function startExistingSignatureDrag(event, signature) {
    event.preventDefault()
    event.stopPropagation()

    const existingContent = signatureContents[signature.id] || {
      type: "text",
      value: "Signature"
    }

    setDragItem({
      type: "move",
      signatureId: signature.id,
      width: signature.width,
      height: signature.height,
      content: existingContent
    })

    setDragPreview({
      x: event.clientX,
      y: event.clientY,
      content: existingContent
    })

    setMessage("Move the signature and release it on the PDF")
  }

  function getCanvasPoint(event) {
    const canvas = signatureCanvasRef.current
    const rect = canvas.getBoundingClientRect()

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  function startDrawing(event) {
    event.preventDefault()

    const canvas = signatureCanvasRef.current
    const context = canvas.getContext("2d")
    const point = getCanvasPoint(event)

    context.lineWidth = 3
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#0f172a"

    context.beginPath()
    context.moveTo(point.x, point.y)

    setIsDrawing(true)
  }

  function drawSignature(event) {
    if (!isDrawing) {
      return
    }

    event.preventDefault()

    const canvas = signatureCanvasRef.current
    const context = canvas.getContext("2d")
    const point = getCanvasPoint(event)

    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function stopDrawing() {
    if (!isDrawing) {
      return
    }

    const canvas = signatureCanvasRef.current
    const dataUrl = canvas.toDataURL("image/png")

    setDrawnSignature(dataUrl)
    setIsDrawing(false)
  }

  function clearDrawnSignature() {
    const canvas = signatureCanvasRef.current
    const context = canvas.getContext("2d")

    context.clearRect(0, 0, canvas.width, canvas.height)
    setDrawnSignature("")
    setMessage("Drawn signature cleared")
  }

  async function saveSignaturePosition(signatureData, contentToSave) {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    setIsSavingSignature(true)

    try {
      const response = await fetch("http://127.0.0.1:8000/api/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(signatureData)
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Could not save signature")
        return
      }

      setSavedSignatures((prevSignatures) => {
        return [data, ...prevSignatures]
      })

      setSignatureContents((prevContents) => {
        return {
          ...prevContents,
          [data.id]: contentToSave || getTypedSignatureContent()
        }
      })

      setMessage("Signature placed successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsSavingSignature(false)
    }
  }

  async function updateSignaturePosition(signatureId, updatedSignatureData) {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    setIsSavingSignature(true)

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/signatures/${signatureId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedSignatureData)
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Could not move signature")
        return
      }

      setSavedSignatures((prevSignatures) => {
        return prevSignatures.map((signature) => {
          if (signature.id === data.id) {
            return data
          }

          return signature
        })
      })

      setMessage("Signature moved successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsSavingSignature(false)
    }
  }

  async function deleteSignature(signatureId) {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/signatures/${signatureId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Could not delete signature")
        return
      }

      setSavedSignatures((prevSignatures) => {
        return prevSignatures.filter((signature) => signature.id !== signatureId)
      })

      setSignatureContents((prevContents) => {
        const updatedContents = { ...prevContents }
        delete updatedContents[signatureId]
        return updatedContents
      })

      setMessage("Signature removed successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    }
  }

  function addTypedDefaultSignatureBox() {
    const signatureData = {
      document_id: Number(id),
      page_number: pageNumber,
      x_position: 0.45,
      y_position: 0.72,
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT
    }

    saveSignaturePosition(signatureData, getTypedSignatureContent())
  }

  function addDrawnDefaultSignatureBox() {
    if (!drawnSignature) {
      setMessage("Please draw your signature first")
      return
    }

    const signatureData = {
      document_id: Number(id),
      page_number: pageNumber,
      x_position: 0.45,
      y_position: 0.72,
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT
    }

    saveSignaturePosition(signatureData, getDrawnSignatureContent())
  }

  function renderSignatureContent(content) {
    if (!content) {
      return (
        <span className="font-serif italic text-lg">
          Signature
        </span>
      )
    }

    if (typeof content === "string") {
      return (
        <span className="font-serif italic text-lg">
          {content}
        </span>
      )
    }

    if (content.type === "image" && content.value) {
      return (
        <img
          src={content.value}
          alt="Drawn signature"
          className="max-w-full max-h-full object-contain"
        />
      )
    }

    return (
      <span className="font-serif italic text-lg">
        {content.value || "Signature"}
      </span>
    )
  }

  const currentPageSignatures = savedSignatures.filter((signature) => {
    return signature.page_number === pageNumber
  })

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-700 text-lg">
          Loading PDF preview...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      {dragPreview && (
        <div
          className="fixed z-50 border-2 border-dashed border-slate-900 bg-white shadow-lg px-8 py-4 rounded-lg pointer-events-none text-slate-800 min-w-36 min-h-14 flex items-center justify-center"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            transform: "translate(-50%, -50%)"
          }}
        >
          {renderSignatureContent(dragPreview.content)}
        </div>
      )}

      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          SignifyPDF
        </h1>

        <Link
          to="/dashboard"
          className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
        >
          Back to Dashboard
        </Link>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <p className="text-slate-700">
              {message}
            </p>
          </div>
        )}

        {documentDetails && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {documentDetails.original_filename}
            </h2>

            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <p>Status: {documentDetails.status}</p>
              <p>Verification ID: {documentDetails.verification_id}</p>
              <p>Size: {(documentDetails.file_size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="bg-white rounded-2xl shadow-lg p-6 h-fit">
            <h3 className="text-xl font-bold text-slate-800">
              Signature Tools
            </h3>

            <label className="mt-5 block text-sm font-medium text-slate-700">
              Type your signature
            </label>

            <input
              type="text"
              value={signatureText}
              onChange={(event) => setSignatureText(event.target.value)}
              placeholder="Enter your name"
              className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-700"
            />

            <p className="mt-4 text-sm text-slate-600">
              Typed Signature Preview
            </p>

            <div
              onMouseDown={(event) => startNewSignatureDrag(event, getTypedSignatureContent())}
              className="mt-2 border-2 border-dashed border-slate-400 bg-slate-50 rounded-xl p-5 text-center cursor-grab active:cursor-grabbing select-none"
            >
              <p className="font-serif italic text-2xl text-slate-800">
                {getCleanSignatureText()}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Drag typed signature onto PDF
              </p>
            </div>

            <button
              onClick={addTypedDefaultSignatureBox}
              disabled={isSavingSignature}
              className="mt-4 w-full bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60"
            >
              Add Typed Default Box
            </button>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm font-medium text-slate-700">
                Draw your signature
              </p>

              <canvas
                ref={signatureCanvasRef}
                width={260}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={drawSignature}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="mt-2 w-full h-32 border border-slate-300 rounded-lg bg-white cursor-crosshair"
              />

              <div className="mt-3 flex gap-3">
                <button
                  onClick={clearDrawnSignature}
                  className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
                >
                  Clear
                </button>

                <button
                  onClick={addDrawnDefaultSignatureBox}
                  disabled={!drawnSignature || isSavingSignature}
                  className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60"
                >
                  Add Drawn
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Drawn Signature Preview
              </p>

              <div
                onMouseDown={(event) => startNewSignatureDrag(event, getDrawnSignatureContent())}
                className="mt-2 border-2 border-dashed border-slate-400 bg-slate-50 rounded-xl p-4 h-24 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              >
                {drawnSignature ? (
                  <img
                    src={drawnSignature}
                    alt="Drawn signature preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-slate-500">
                    Draw first, then drag
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Signatures added: {savedSignatures.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Drag signature boxes on the PDF to adjust their position.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Click × on a signature box to remove it.
              </p>
            </div>
          </aside>

          {pdfUrl && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goToPreviousPage}
                  disabled={pageNumber <= 1}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>

                <p className="text-slate-700">
                  Page {pageNumber} of {numPages || "..."}
                </p>

                <button
                  onClick={goToNextPage}
                  disabled={!numPages || pageNumber >= numPages}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              <div className="overflow-auto border border-slate-200 rounded-xl bg-slate-50 p-4 flex justify-center">
                <div
                  ref={pdfAreaRef}
                  className="relative inline-block overflow-hidden bg-white"
                >
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    loading="Loading PDF..."
                    error="Failed to load PDF"
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={800}
                    />
                  </Document>

                  {currentPageSignatures.map((signature) => (
                    <div
                      key={signature.id}
                      onMouseDown={(event) => startExistingSignatureDrag(event, signature)}
                      className="absolute z-20 border-2 border-dashed border-slate-900 bg-white/80 flex items-center justify-center text-xs font-bold text-slate-800 cursor-grab active:cursor-grabbing select-none"
                      style={{
                        left: `${signature.x_position * 100}%`,
                        top: `${signature.y_position * 100}%`,
                        width: `${signature.width * 100}%`,
                        height: `${signature.height * 100}%`
                      }}
                    >
                      {renderSignatureContent(signatureContents[signature.id])}

                      <button
                        onMouseDown={(event) => {
                          event.stopPropagation()
                        }}
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteSignature(signature.id)
                        }}
                        className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Type or draw your signature, drag it onto the PDF, and move it wherever needed.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default DocumentPreview