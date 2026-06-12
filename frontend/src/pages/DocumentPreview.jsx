import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Document, Page, pdfjs } from "react-pdf"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

function DocumentPreview() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [documentDetails, setDocumentDetails] = useState(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [savedSignatures, setSavedSignatures] = useState([])
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSignature, setIsSavingSignature] = useState(false)

  useEffect(() => {
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
        const fileUrl = URL.createObjectURL(pdfBlob)

        setPdfUrl(fileUrl)
      } catch (error) {
        setMessage("Backend is not running or something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    loadDocumentPreview()

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [id, navigate])

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

  async function addSignaturePlaceholder() {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    setIsSavingSignature(true)
    setMessage("")

    const signatureData = {
      document_id: Number(id),
      page_number: pageNumber,
      x_position: 0.45,
      y_position: 0.72,
      width: 0.25,
      height: 0.08
    }

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
        setMessage(data.detail || "Could not save signature placeholder")
        setIsSavingSignature(false)
        return
      }

      setSavedSignatures((prevSignatures) => {
        return [data, ...prevSignatures]
      })

      setMessage("Signature placeholder saved successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsSavingSignature(false)
    }
  }

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

      <section className="max-w-6xl mx-auto px-6 py-8">
        {message && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
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

            <button
              onClick={addSignaturePlaceholder}
              disabled={isSavingSignature}
              className="mt-5 bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60"
            >
              {isSavingSignature ? "Saving..." : "Add Signature Placeholder"}
            </button>
          </div>
        )}

        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-slate-800">
            Saved Signature Positions
          </h3>

          {savedSignatures.length === 0 ? (
            <p className="mt-3 text-slate-600">
              No signature positions saved yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {savedSignatures.map((signature) => (
                <div
                  key={signature.id}
                  className="border border-slate-200 rounded-xl p-4 text-sm text-slate-700"
                >
                  <p className="font-semibold">
                    Signature #{signature.id}
                  </p>
                  <p>Page: {signature.page_number}</p>
                  <p>
                    Position: x = {signature.x_position}, y = {signature.y_position}
                  </p>
                  <p>
                    Size: width = {signature.width}, height = {signature.height}
                  </p>
                  <p>Status: {signature.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {pdfUrl && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
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
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default DocumentPreview