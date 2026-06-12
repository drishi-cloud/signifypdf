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
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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
          <div className="bg-white rounded-2xl shadow-lg p-6">
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