import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

const API_BASE_URL = "http://127.0.0.1:8000"

const MIN_PDF_FILE_SIZE = 1024
const MAX_PDF_FILE_SIZE = 10 * 1024 * 1024

function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    async function loadDashboardData() {
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/login")
        return
      }

      try {
        const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const userData = await userResponse.json()

        if (!userResponse.ok) {
          localStorage.removeItem("token")
          navigate("/login")
          return
        }

        setUser(userData)

        const documentsResponse = await fetch(`${API_BASE_URL}/api/docs`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const documentsData = await documentsResponse.json()

        if (documentsResponse.ok) {
          setDocuments(documentsData)
        }
      } catch (error) {
        setMessage("Backend is not running or something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [navigate])

  function validatePdfFile(file) {
    if (!file) {
      return "Please select a PDF file"
    }

    const isPdfByType = file.type === "application/pdf"
    const isPdfByName = file.name.toLowerCase().endsWith(".pdf")

    if (!isPdfByType && !isPdfByName) {
      return "Only PDF files are supported."
    }

    if (file.size < MIN_PDF_FILE_SIZE) {
      return "PDF file is too small. Minimum size is 1 KB."
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
      return "PDF file is too large. Maximum size is 10 MB."
    }

    return ""
  }

  function handleFileChange(event) {
    const file = event.target.files[0]

    const validationError = validatePdfFile(file)

    if (validationError) {
      setSelectedFile(null)
      setMessage(validationError)
      event.target.value = ""
      return
    }

    setSelectedFile(file)
    setMessage(`${file.name} selected successfully`)
  }

  async function handleUpload(event) {
    event.preventDefault()

    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    const validationError = validatePdfFile(selectedFile)

    if (validationError) {
      setMessage(validationError)
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    setIsUploading(true)
    setMessage("Uploading PDF...")

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Could not upload document")
        return
      }

      setDocuments((prevDocuments) => {
        return [data, ...prevDocuments]
      })

      setSelectedFile(null)
      setMessage("PDF uploaded successfully")
      event.target.reset()
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsUploading(false)
    }
  }

  async function deleteDocument(documentId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this PDF? This action cannot be undone."
    )

    if (!confirmDelete) {
      return
    }

    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/${documentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Could not delete document")
        return
      }

      setDocuments((prevDocuments) => {
        return prevDocuments.filter((document) => document.id !== documentId)
      })

      setMessage("PDF deleted successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    }
  }

  function handleLogout() {
    localStorage.removeItem("token")
    navigate("/login")
  }

  function formatFileSize(sizeInBytes) {
    if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "N/A"
    }

    return new Date(dateValue).toLocaleString()
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-700 text-lg">
          Loading dashboard...
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

        <div className="flex items-center gap-4">
          {user && (
            <p className="text-sm text-slate-600">
              Welcome, {user.name}
            </p>
          )}

          <Link
            to="/verify"
            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
          >
            Verify Document
          </Link>

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800">
            Upload PDF Document
          </h2>

          <p className="mt-2 text-slate-600">
            Upload a PDF document that you want to sign or verify.
          </p>

          <form onSubmit={handleUpload} className="mt-6">
            <label className="block text-sm font-medium text-slate-700">
              Select PDF file
            </label>

            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-slate-700 border border-slate-300 rounded-lg cursor-pointer bg-white focus:outline-none"
            />

            <p className="mt-2 text-xs text-slate-500">
              Supported: PDF only. Minimum size: 1 KB. Maximum size: 10 MB.
            </p>

            {selectedFile && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-700">
                  Selected file: {selectedFile.name}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="mt-5 bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
          </form>
        </div>

        {message && (
          <div className="bg-white rounded-xl shadow p-4 mt-6">
            <p className="text-slate-700">
              {message}
            </p>
          </div>
        )}

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              My Documents
            </h2>

            <p className="text-sm text-slate-500">
              Total: {documents.length}
            </p>
          </div>

          {documents.length === 0 ? (
            <div className="mt-6 bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-slate-600">
                No documents uploaded yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-3 px-3 text-sm font-semibold text-slate-700">
                      File Name
                    </th>

                    <th className="py-3 px-3 text-sm font-semibold text-slate-700">
                      Size
                    </th>

                    <th className="py-3 px-3 text-sm font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="py-3 px-3 text-sm font-semibold text-slate-700">
                      Verification ID
                    </th>

                    <th className="py-3 px-3 text-sm font-semibold text-slate-700">
                      Uploaded At
                    </th>

                    <th className="py-3 px-3 text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-4 px-3 text-sm text-slate-800">
                        {document.original_filename}
                      </td>

                      <td className="py-4 px-3 text-sm text-slate-600">
                        {formatFileSize(document.file_size)}
                      </td>

                      <td className="py-4 px-3 text-sm">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {document.status}
                        </span>
                      </td>

                      <td className="py-4 px-3 text-sm text-slate-600">
                        {document.verification_id}
                      </td>

                      <td className="py-4 px-3 text-sm text-slate-600">
                        {formatDate(document.created_at)}
                      </td>

                      <td className="py-4 px-3 text-sm">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/documents/${document.id}`}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
                          >
                            View
                          </Link>

                          <button
                            onClick={() => deleteDocument(document.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default Dashboard