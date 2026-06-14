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

  const [documentDetails, setDocumentDetails] = useState(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [savedSignatures, setSavedSignatures] = useState([])
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSignature, setIsSavingSignature] = useState(false)

  const [dragItem, setDragItem] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)

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
        y: event.clientY
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

        await saveSignaturePosition(signatureData)
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

  function startNewSignatureDrag(event) {
    event.preventDefault()

    setDragItem({
      type: "new",
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT
    })

    setDragPreview({
      x: event.clientX,
      y: event.clientY
    })

    setMessage("Drag and release the signature on the PDF")
  }

  function startExistingSignatureDrag(event, signature) {
    event.preventDefault()
    event.stopPropagation()

    setDragItem({
      type: "move",
      signatureId: signature.id,
      width: signature.width,
      height: signature.height
    })

    setDragPreview({
      x: event.clientX,
      y: event.clientY
    })

    setMessage("Move the signature and release it on the PDF")
  }

  async function saveSignaturePosition(signatureData) {
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

      setMessage("Signature removed successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    }
  }

  function addDefaultSignatureBox() {
    const signatureData = {
      document_id: Number(id),
      page_number: pageNumber,
      x_position: 0.45,
      y_position: 0.72,
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT
    }

    saveSignaturePosition(signatureData)
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
          className="fixed z-50 border-2 border-dashed border-slate-900 bg-white shadow-lg px-8 py-4 rounded-lg pointer-events-none font-bold text-slate-800"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            transform: "translate(-50%, -50%)"
          }}
        >
          Signature
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="bg-white rounded-2xl shadow-lg p-6 h-fit">
            <h3 className="text-xl font-bold text-slate-800">
              Signature Tools
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Hold and drag this signature card onto the PDF.
            </p>

            <div
              onMouseDown={startNewSignatureDrag}
              className="mt-5 border-2 border-dashed border-slate-400 bg-slate-50 rounded-xl p-5 text-center cursor-grab active:cursor-grabbing select-none"
            >
              <p className="font-bold text-slate-800">
                Signature
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Drag me onto PDF
              </p>
            </div>

            <button
              onClick={addDefaultSignatureBox}
              disabled={isSavingSignature}
              className="mt-5 w-full bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60"
            >
              {isSavingSignature ? "Saving..." : "Add Default Box"}
            </button>

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
                      <span>
                        Signature #{signature.id}
                      </span>

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
                Hold the signature card, move it over the PDF, and release. Existing signature boxes can also be moved.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default DocumentPreview