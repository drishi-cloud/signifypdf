import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState(null)

  useEffect(() => {
    async function loadDashboardData() {
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/login")
        return
      }

      try {
        const userResponse = await fetch("http://127.0.0.1:8000/api/auth/me", {
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

        const docsResponse = await fetch("http://127.0.0.1:8000/api/docs", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const docsData = await docsResponse.json()

        if (docsResponse.ok) {
          setDocuments(docsData)
        }
      } catch (error) {
        setMessage("Could not connect to backend")
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [navigate])

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0])
    setMessage("")
  }

  async function handleUpload(event) {
    event.preventDefault()

    if (!selectedFile) {
      setMessage("Please select a PDF file first")
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Only PDF files are allowed")
      return
    }

    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    const uploadData = new FormData()
    uploadData.append("file", selectedFile)

    setIsUploading(true)
    setMessage("")

    try {
      const response = await fetch("http://127.0.0.1:8000/api/docs/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: uploadData
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Upload failed")
        setIsUploading(false)
        return
      }

      setDocuments((prevDocuments) => {
        return [data, ...prevDocuments]
      })

      setSelectedFile(null)
      setMessage("PDF uploaded successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsUploading(false)
    }
  }

  async function deleteDocument(documentId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this PDF? This will also remove its saved signatures."
    )

    if (!confirmDelete) {
      return
    }

    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/login")
      return
    }

    setDeletingDocumentId(documentId)
    setMessage("")

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/docs/${documentId}`, {
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

      setMessage("Document deleted successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setDeletingDocumentId(null)
    }
  }

  function handleLogout() {
    localStorage.removeItem("token")
    navigate("/login")
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

        <button
          onClick={handleLogout}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
        >
          Logout
        </button>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-3xl font-bold text-slate-800">
            Dashboard
          </h2>

          {user && (
            <div className="mt-4 text-slate-700">
              <p>
                Welcome, <span className="font-semibold">{user.name}</span>
              </p>
              <p className="mt-1">
                Email: {user.email}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-slate-800">
            Upload PDF
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Choose a PDF document to upload for signing.
          </p>

          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 border border-slate-300 rounded-lg cursor-pointer bg-white focus:outline-none"
            />

            {selectedFile && (
              <p className="text-sm text-slate-600">
                Selected file: {selectedFile.name}
              </p>
            )}

            {message && (
              <p className="text-sm text-slate-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-slate-800">
            My Documents
          </h3>

          {documents.length === 0 ? (
            <p className="mt-4 text-slate-600">
              No documents uploaded yet.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="border border-slate-200 rounded-xl p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      {document.original_filename}
                    </h4>

                    <p className="text-sm text-slate-600">
                      Status: {document.status}
                    </p>

                    <p className="text-sm text-slate-600">
                      Verification ID: {document.verification_id}
                    </p>

                    <p className="text-sm text-slate-600">
                      Size: {(document.file_size / 1024).toFixed(2)} KB
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                      Uploaded
                    </span>

                    <Link
                      to={`/documents/${document.id}`}
                      className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700"
                    >
                      View
                    </Link>

                    <button
                      onClick={() => deleteDocument(document.id)}
                      disabled={deletingDocumentId === document.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingDocumentId === document.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default Dashboard