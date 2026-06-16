import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Document, Page, pdfjs } from "react-pdf"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

const API_BASE_URL = "http://127.0.0.1:8000"

const SIGNATURE_WIDTH = 0.25
const SIGNATURE_HEIGHT = 0.08

const MIN_SIGNATURE_IMAGE_SIZE = 1024
const MAX_SIGNATURE_IMAGE_SIZE = 2 * 1024 * 1024

const MAX_IMAGE_DATA_LENGTH = 900000
const MAX_SIGNATURE_CONTENTS_LENGTH = 3000000

function DocumentPreview() {
  const { id } = useParams()
  const navigate = useNavigate()

  const pdfAreaRef = useRef(null)
  const signatureCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const [documentDetails, setDocumentDetails] = useState(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [savedSignatures, setSavedSignatures] = useState([])
  const [signatureContents, setSignatureContents] = useState({})

  const [signatureMode, setSignatureMode] = useState("typed")
  const [signatureText, setSignatureText] = useState("")
  const [typedSignatureFont, setTypedSignatureFont] = useState("Georgia, serif")
  const [typedSignatureColor, setTypedSignatureColor] = useState("#0f172a")

  const [drawnSignature, setDrawnSignature] = useState("")
  const [drawPenColor, setDrawPenColor] = useState("#0f172a")

  const [uploadedSignature, setUploadedSignature] = useState("")

  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSignature, setIsSavingSignature] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [deletingSignatureId, setDeletingSignatureId] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const [dragItem, setDragItem] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const [hasLoadedSignatureStorage, setHasLoadedSignatureStorage] = useState(false)

  useEffect(() => {
    setHasLoadedSignatureStorage(false)

    const savedTypedSignature = safeGetStorage(getStorageKey("typed_signature"))
    const savedTypedFont = safeGetStorage(getStorageKey("typed_signature_font"))
    const savedTypedColor = safeGetStorage(getStorageKey("typed_signature_color"))
    const savedDrawPenColor = safeGetStorage(getStorageKey("draw_pen_color"))

    const savedDrawnSignature = safeGetStorage(getStorageKey("drawn_signature"))
    const savedUploadedSignature = safeGetStorage(getStorageKey("uploaded_signature"))

    if (savedTypedSignature) {
      setSignatureText(savedTypedSignature)
    }

    if (savedTypedFont) {
      setTypedSignatureFont(savedTypedFont)
    }

    if (savedTypedColor) {
      setTypedSignatureColor(savedTypedColor)
    }

    if (savedDrawPenColor) {
      setDrawPenColor(savedDrawPenColor)
    }

    if (savedDrawnSignature && savedDrawnSignature.length < MAX_IMAGE_DATA_LENGTH) {
      setDrawnSignature(savedDrawnSignature)
    } else if (savedDrawnSignature) {
      safeRemoveStorage(getStorageKey("drawn_signature"))
    }

    if (savedUploadedSignature && savedUploadedSignature.length < MAX_IMAGE_DATA_LENGTH) {
      setUploadedSignature(savedUploadedSignature)
    } else if (savedUploadedSignature) {
      safeRemoveStorage(getStorageKey("uploaded_signature"))
    }

    const newStorageKey = getStorageKey(`signature_contents_${id}`)
    const oldStorageKey = getStorageKey(`signature_texts_${id}`)

    const newStoredContents = parseStoredSignatureContents(
      safeGetStorage(newStorageKey),
      newStorageKey
    )

    const oldStoredContents = parseStoredSignatureContents(
      safeGetStorage(oldStorageKey),
      oldStorageKey
    )

    if (newStoredContents && Object.keys(newStoredContents).length > 0) {
      setSignatureContents(newStoredContents)
    } else if (oldStoredContents && Object.keys(oldStoredContents).length > 0) {
      setSignatureContents(oldStoredContents)
    } else {
      setSignatureContents({})
    }

    setHasLoadedSignatureStorage(true)
  }, [id])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    safeSetStorage(getStorageKey("typed_signature"), signatureText)
  }, [signatureText, hasLoadedSignatureStorage])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    safeSetStorage(getStorageKey("typed_signature_font"), typedSignatureFont)
  }, [typedSignatureFont, hasLoadedSignatureStorage])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    safeSetStorage(getStorageKey("typed_signature_color"), typedSignatureColor)
  }, [typedSignatureColor, hasLoadedSignatureStorage])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    safeSetStorage(getStorageKey("draw_pen_color"), drawPenColor)
  }, [drawPenColor, hasLoadedSignatureStorage])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    if (drawnSignature) {
      const isSaved = safeSetStorage(getStorageKey("drawn_signature"), drawnSignature)

      if (!isSaved) {
        setMessage("Drawn signature is too large to save. Please draw again.")
      }
    } else {
      safeRemoveStorage(getStorageKey("drawn_signature"))
    }
  }, [drawnSignature, hasLoadedSignatureStorage])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    if (uploadedSignature) {
      const isSaved = safeSetStorage(getStorageKey("uploaded_signature"), uploadedSignature)

      if (!isSaved) {
        setUploadedSignature("")
        setMessage("Uploaded signature is too large. Please upload a smaller image.")
      }
    } else {
      safeRemoveStorage(getStorageKey("uploaded_signature"))
    }
  }, [uploadedSignature, hasLoadedSignatureStorage])

  useEffect(() => {
    if (!hasLoadedSignatureStorage) {
      return
    }

    const storageValue = JSON.stringify(signatureContents)

    if (storageValue.length > MAX_SIGNATURE_CONTENTS_LENGTH) {
      setMessage("Signature data is too large. Please use a smaller signature image.")
      return
    }

    const isSaved = safeSetStorage(
      getStorageKey(`signature_contents_${id}`),
      storageValue
    )

    if (!isSaved) {
      setMessage("Could not save signature data. Please use a smaller image.")
    }
  }, [signatureContents, id, hasLoadedSignatureStorage])

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
        const detailsResponse = await fetch(`${API_BASE_URL}/api/docs/${id}`, {
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

        const signaturesResponse = await fetch(`${API_BASE_URL}/api/signatures/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const signaturesData = await signaturesResponse.json()

        if (signaturesResponse.ok) {
          setSavedSignatures(signaturesData)
        }

        const fileResponse = await fetch(`${API_BASE_URL}/api/docs/${id}/file`, {
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

    function handlePointerMove(event) {
      setDragPreview({
        x: event.clientX,
        y: event.clientY,
        content: dragItem.content
      })
    }

    async function handlePointerUp(event) {
      const pdfArea = pdfAreaRef.current

      if (!pdfArea) {
        stopDragging()
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
        stopDragging()
        return
      }

      const position = calculateSignaturePosition(
        event.clientX,
        event.clientY,
        dragItem.width,
        dragItem.height,
        pdfBox,
        dragItem.offsetX,
        dragItem.offsetY
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

      stopDragging()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [dragItem, id, pageNumber])

  function decodeJwtPayload(token) {
    try {
      const payloadBase64Url = token.split(".")[1]

      if (!payloadBase64Url) {
        return null
      }

      const payloadBase64 = payloadBase64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payloadBase64Url.length / 4) * 4, "=")

      return JSON.parse(atob(payloadBase64))
    } catch (error) {
      return null
    }
  }

  function getCurrentUserStoragePrefix() {
    const token = localStorage.getItem("token")

    if (!token) {
      return "guest"
    }

    const payload = decodeJwtPayload(token)

    if (!payload) {
      return "guest"
    }

    return `user_${payload.user_id || payload.sub || "guest"}`
  }

  function getStorageKey(key) {
    return `signifypdf_${getCurrentUserStoragePrefix()}_${key}`
  }

  function safeGetStorage(key) {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      return null
    }
  }

  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      return false
    }
  }

  function safeRemoveStorage(key) {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      return
    }
  }

  function parseStoredSignatureContents(rawValue, key) {
    if (!rawValue) {
      return null
    }

    if (rawValue.length > MAX_SIGNATURE_CONTENTS_LENGTH) {
      safeRemoveStorage(key)
      return null
    }

    try {
      const parsedValue = JSON.parse(rawValue)

      if (parsedValue && typeof parsedValue === "object") {
        return parsedValue
      }

      return null
    } catch (error) {
      safeRemoveStorage(key)
      return null
    }
  }

  function stopDragging() {
    setDragItem(null)
    setDragPreview(null)
  }

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

  function calculateSignaturePosition(
    clientX,
    clientY,
    signatureWidth,
    signatureHeight,
    pdfBox,
    offsetX,
    offsetY
  ) {
    let rawX
    let rawY

    if (offsetX !== undefined && offsetY !== undefined) {
      rawX = (clientX - pdfBox.left - offsetX) / pdfBox.width
      rawY = (clientY - pdfBox.top - offsetY) / pdfBox.height
    } else {
      rawX = (clientX - pdfBox.left) / pdfBox.width - signatureWidth / 2
      rawY = (clientY - pdfBox.top) / pdfBox.height - signatureHeight / 2
    }

    const finalX = Math.min(
      Math.max(rawX, 0),
      1 - signatureWidth
    )

    const finalY = Math.min(
      Math.max(rawY, 0),
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

  function isLightColor(hexColor) {
    if (!hexColor || !hexColor.startsWith("#") || hexColor.length !== 7) {
      return false
    }

    const hex = hexColor.replace("#", "")

    const red = parseInt(hex.substring(0, 2), 16)
    const green = parseInt(hex.substring(2, 4), 16)
    const blue = parseInt(hex.substring(4, 6), 16)

    const brightness = red * 0.299 + green * 0.587 + blue * 0.114

    return brightness > 180
  }

  function getPreviewBackgroundColor(content) {
    if (content && content.previewBackground) {
      return content.previewBackground
    }

    if (content && content.type === "text") {
      const textColor = content.color || "#0f172a"

      if (isLightColor(textColor)) {
        return "#1e293b"
      }
    }

    return "#f8fafc"
  }

  function getTypedSignatureContent() {
    return {
      type: "text",
      source: "typed",
      value: getCleanSignatureText(),
      font: typedSignatureFont,
      color: typedSignatureColor
    }
  }

  function getDrawnSignatureContent() {
    return {
      type: "image",
      source: "drawn",
      value: drawnSignature,
      previewBackground: isLightColor(drawPenColor) ? "#1e293b" : "#f8fafc"
    }
  }

  function getUploadedSignatureContent() {
    return {
      type: "image",
      source: "uploaded",
      value: uploadedSignature,
      previewBackground: "#f8fafc"
    }
  }

  function handleSignatureTextChange(event) {
    setSignatureText(event.target.value)
  }

  function startNewSignatureDrag(event, content) {
    event.preventDefault()

    if (event.button !== undefined && event.button !== 0) {
      return
    }

    if (content.type === "image" && !content.value) {
      setMessage("Please draw or upload your signature first")
      return
    }

    setDragItem({
      type: "new",
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT,
      content
    })

    setDragPreview({
      x: event.clientX,
      y: event.clientY,
      content
    })

    setMessage("Drag and release the signature on the PDF")
  }

  function startExistingSignatureDrag(event, signature) {
    event.preventDefault()
    event.stopPropagation()

    if (event.button !== undefined && event.button !== 0) {
      return
    }

    if (deletingSignatureId === signature.id) {
      return
    }

    const signatureBox = event.currentTarget.getBoundingClientRect()

    const existingContent = signatureContents[signature.id] || {
      type: "text",
      source: "typed",
      value: "Signature",
      font: "Georgia, serif",
      color: "#0f172a"
    }

    setDragItem({
      type: "move",
      signatureId: signature.id,
      width: signature.width,
      height: signature.height,
      content: existingContent,
      offsetX: event.clientX - signatureBox.left,
      offsetY: event.clientY - signatureBox.top
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
    context.strokeStyle = drawPenColor

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

    context.strokeStyle = drawPenColor
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
    setMessage("Drawn signature ready. Drag the preview onto the PDF.")
  }

  function clearDrawnSignature() {
    const canvas = signatureCanvasRef.current
    const context = canvas.getContext("2d")

    context.clearRect(0, 0, canvas.width, canvas.height)
    setDrawnSignature("")
    setMessage("Drawn signature cleared")
  }

  function handleSignatureImageUpload(event) {
    const file = event.target.files[0]

    if (!file) {
      return
    }

    const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg"]

    if (!allowedImageTypes.includes(file.type)) {
      setMessage("Only PNG, JPG, and JPEG signature images are supported.")
      return
    }

    if (file.size < MIN_SIGNATURE_IMAGE_SIZE) {
      setMessage("Signature image is too small. Minimum size is 1 KB.")
      return
    }

    if (file.size > MAX_SIGNATURE_IMAGE_SIZE) {
      setMessage("Signature image is too large. Maximum size is 2 MB.")
      return
    }

    const reader = new FileReader()

    reader.onload = async () => {
      try {
        if (typeof reader.result !== "string") {
          setMessage("Could not read this image")
          return
        }

        const compressedImage = await compressImage(reader.result)

        if (compressedImage.length > MAX_IMAGE_DATA_LENGTH) {
          setMessage("Image is still too large. Please upload a smaller signature image.")
          return
        }

        setUploadedSignature(compressedImage)
        setMessage("Signature image uploaded. Drag the preview onto the PDF.")
      } catch (error) {
        setMessage("Could not upload this image. Please try another image.")
      }
    }

    reader.onerror = () => {
      setMessage("Could not upload signature image")
    }

    reader.readAsDataURL(file)
  }

  function compressImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image()

      image.onload = () => {
        const canvas = document.createElement("canvas")
        const maxWidth = 360
        const maxHeight = 130

        let width = image.width
        let height = image.height

        if (width > maxWidth) {
          height = height * (maxWidth / width)
          width = maxWidth
        }

        if (height > maxHeight) {
          width = width * (maxHeight / height)
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext("2d")
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL("image/png")
        resolve(compressedDataUrl)
      }

      image.onerror = () => {
        reject(new Error("Image could not be loaded"))
      }

      image.src = dataUrl
    })
  }

  function clearUploadedSignature() {
    setUploadedSignature("")

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    setMessage("Uploaded signature cleared")
  }

  async function saveSignaturePosition(signatureData, contentToSave) {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    setIsSavingSignature(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures`, {
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
      const response = await fetch(`${API_BASE_URL}/api/signatures/${signatureId}`, {
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

    setDeletingSignatureId(signatureId)
    setMessage("Removing signature...")

    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures/${signatureId}`, {
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
    } finally {
      setDeletingSignatureId(null)
    }
  }

  async function finalizeSignedPdf() {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    if (savedSignatures.length === 0) {
      setMessage("Please place at least one signature before generating signed PDF.")
      return
    }

    const finalSignatures = savedSignatures
      .map((signature) => {
        const content = signatureContents[signature.id]

        if (!content) {
          return null
        }

        return {
          signature_id: signature.id,
          type: content.type || "text",
          value: content.value || "Signature",
          font: content.font || "Georgia, serif",
          color: content.color || "#0f172a"
        }
      })
      .filter(Boolean)

    if (finalSignatures.length === 0) {
      setMessage("Signature content not found. Please add the signature again.")
      return
    }

    setIsFinalizing(true)
    setMessage("Generating signed PDF...")

    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          document_id: Number(id),
          signatures: finalSignatures
        })
      })

      if (!response.ok) {
        let errorMessage = "Could not generate signed PDF"

        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (error) {
          errorMessage = "Could not generate signed PDF"
        }

        setMessage(errorMessage)
        return
      }

      const signedPdfBlob = await response.blob()
      const downloadUrl = URL.createObjectURL(signedPdfBlob)

      const downloadLink = window.document.createElement("a")
      downloadLink.href = downloadUrl
      downloadLink.download = `signed-${documentDetails?.original_filename || "document.pdf"}`
      window.document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()

      URL.revokeObjectURL(downloadUrl)

      setDocumentDetails((prevDetails) => {
        if (!prevDetails) {
          return prevDetails
        }

        return {
          ...prevDetails,
          status: "signed"
        }
      })

      setSavedSignatures((prevSignatures) => {
        return prevSignatures.map((signature) => {
          return {
            ...signature,
            status: "signed"
          }
        })
      })

      setMessage("Signed PDF generated successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsFinalizing(false)
    }
  }

  function renderSignatureContent(content) {
    if (!content) {
      return (
        <span
          className="italic text-lg"
          style={{
            fontFamily: "Georgia, serif",
            color: "#0f172a"
          }}
        >
          Signature
        </span>
      )
    }

    if (typeof content === "string") {
      return (
        <span
          className="italic text-lg"
          style={{
            fontFamily: "Georgia, serif",
            color: "#0f172a"
          }}
        >
          {content}
        </span>
      )
    }

    if (content.type === "image" && content.value) {
      return (
        <img
          src={content.value}
          alt="Signature"
          draggable={false}
          className="max-w-full max-h-full object-contain"
        />
      )
    }

    return (
      <span
        className="italic text-lg"
        style={{
          fontFamily: content.font || "Georgia, serif",
          color: content.color || "#0f172a"
        }}
      >
        {content.value || "Signature"}
      </span>
    )
  }

  function getModeButtonClass(mode) {
    if (signatureMode === mode) {
      return "bg-slate-800 text-white"
    }

    return "bg-slate-100 text-slate-700 hover:bg-slate-200"
  }

  const typedContent = getTypedSignatureContent()
  const drawnContent = getDrawnSignatureContent()
  const uploadedContent = getUploadedSignatureContent()

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
          className="fixed z-50 pointer-events-none text-slate-800 min-w-36 min-h-14 flex items-center justify-center rounded-md border border-dashed border-slate-400 p-2 shadow-lg"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            transform: "translate(-50%, -50%)",
            backgroundColor: getPreviewBackgroundColor(dragPreview.content)
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="bg-white rounded-2xl shadow-lg p-6 h-fit lg:sticky lg:top-6">
            <h3 className="text-xl font-bold text-slate-800">
              Signature Tools
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Choose one option and drag the preview onto the PDF.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                onClick={() => setSignatureMode("typed")}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${getModeButtonClass("typed")}`}
              >
                Type
              </button>

              <button
                onClick={() => setSignatureMode("draw")}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${getModeButtonClass("draw")}`}
              >
                Draw
              </button>

              <button
                onClick={() => setSignatureMode("upload")}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${getModeButtonClass("upload")}`}
              >
                Upload
              </button>
            </div>

            {signatureMode === "typed" && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-slate-700">
                  Type your signature
                </label>

                <input
                  type="text"
                  value={signatureText}
                  onChange={handleSignatureTextChange}
                  placeholder="Enter your name"
                  className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-700"
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Font
                    </label>

                    <select
                      value={typedSignatureFont}
                      onChange={(event) => setTypedSignatureFont(event.target.value)}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
                    >
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="'Brush Script MT', cursive">Brush Script</option>
                      <option value="cursive">Cursive</option>
                      <option value="monospace">Monospace</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Color
                    </label>

                    <input
                      type="color"
                      value={typedSignatureColor}
                      onChange={(event) => setTypedSignatureColor(event.target.value)}
                      className="mt-1 w-full h-10 border border-slate-300 rounded-lg bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <div
                  onPointerDown={(event) => startNewSignatureDrag(event, typedContent)}
                  className="mt-4 border-2 border-dashed border-slate-400 rounded-xl p-5 text-center cursor-grab active:cursor-grabbing select-none touch-none hover:opacity-95"
                  style={{
                    backgroundColor: getPreviewBackgroundColor(typedContent)
                  }}
                >
                  <p
                    className="italic text-2xl"
                    style={{
                      fontFamily: typedSignatureFont,
                      color: typedSignatureColor
                    }}
                  >
                    {getCleanSignatureText()}
                  </p>

                  <p className="mt-2 text-xs text-slate-300">
                    Drag typed signature to PDF
                  </p>
                </div>
              </div>
            )}

            {signatureMode === "draw" && (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">
                    Draw your signature
                  </p>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Pen
                    </span>

                    <input
                      type="color"
                      value={drawPenColor}
                      onChange={(event) => setDrawPenColor(event.target.value)}
                      className="w-9 h-8 border border-slate-300 rounded bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <canvas
                  ref={signatureCanvasRef}
                  width={260}
                  height={80}
                  onMouseDown={startDrawing}
                  onMouseMove={drawSignature}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="mt-2 w-full h-20 border border-slate-300 rounded-lg bg-white cursor-crosshair"
                />

                <button
                  onClick={clearDrawnSignature}
                  className="mt-3 w-full border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
                >
                  Clear Drawing
                </button>

                <div
                  onPointerDown={(event) => startNewSignatureDrag(event, drawnContent)}
                  className="mt-4 border-2 border-dashed border-slate-400 rounded-xl p-3 h-24 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none hover:opacity-95"
                  style={{
                    backgroundColor: getPreviewBackgroundColor(drawnContent)
                  }}
                >
                  {drawnSignature ? (
                    <img
                      src={drawnSignature}
                      alt="Drawn signature preview"
                      draggable={false}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-500 text-center">
                      Draw first, then drag this preview
                    </p>
                  )}
                </div>
              </div>
            )}

            {signatureMode === "upload" && (
              <div className="mt-5">
                <p className="text-sm font-medium text-slate-700">
                  Upload signature image
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleSignatureImageUpload}
                  className="mt-2 block w-full text-sm text-slate-700 border border-slate-300 rounded-lg cursor-pointer bg-white focus:outline-none"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Supported: PNG, JPG, JPEG. Minimum size: 1 KB. Maximum size: 2 MB.
                </p>

                <div
                  onPointerDown={(event) => startNewSignatureDrag(event, uploadedContent)}
                  className="mt-4 border-2 border-dashed border-slate-400 rounded-xl p-3 h-24 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none hover:opacity-95"
                  style={{
                    backgroundColor: getPreviewBackgroundColor(uploadedContent)
                  }}
                >
                  {uploadedSignature ? (
                    <img
                      src={uploadedSignature}
                      alt="Uploaded signature preview"
                      draggable={false}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-500 text-center">
                      Upload image, then drag this preview
                    </p>
                  )}
                </div>

                <button
                  onClick={clearUploadedSignature}
                  className="mt-3 w-full border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
                >
                  Clear Uploaded
                </button>
              </div>
            )}

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Signatures added: {savedSignatures.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Drag preview → drop on PDF.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Hover over placed signature to see border and delete button.
              </p>
            </div>

            <button
              onClick={finalizeSignedPdf}
              disabled={savedSignatures.length === 0 || isFinalizing}
              className="mt-4 w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isFinalizing ? "Generating..." : "Generate Signed PDF"}
            </button>
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
                      onPointerDown={(event) => startExistingSignatureDrag(event, signature)}
                      className="group absolute z-20 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none rounded-md border border-transparent hover:border-slate-500 hover:border-dashed active:border-slate-800 active:border-solid transition-all"
                      style={{
                        left: `${signature.x_position * 100}%`,
                        top: `${signature.y_position * 100}%`,
                        width: `${signature.width * 100}%`,
                        height: `${signature.height * 100}%`
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center pointer-events-none">
                        {renderSignatureContent(signatureContents[signature.id])}
                      </div>

                      <button
                        type="button"
                        disabled={deletingSignatureId === signature.id}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          deleteSignature(signature.id)
                        }}
                        className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full w-8 h-8 text-sm flex items-center justify-center opacity-100 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                      >
                        {deletingSignatureId === signature.id ? "..." : "×"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Drag a signature from the left side and drop it on the PDF.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default DocumentPreview