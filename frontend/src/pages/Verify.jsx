import { useState } from "react"
import { Link } from "react-router-dom"

const API_BASE_URL = "http://127.0.0.1:8000"

function Verify() {
  const [verificationId, setVerificationId] = useState("")
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState("")
  const [isChecking, setIsChecking] = useState(false)

  async function handleVerify(event) {
    event.preventDefault()

    const cleanVerificationId = verificationId.trim()

    if (!cleanVerificationId) {
      setMessage("Please enter a verification ID")
      setResult(null)
      return
    }

    setIsChecking(true)
    setMessage("Checking document...")
    setResult(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/${cleanVerificationId}`)

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Document not found")
        setResult(null)
        return
      }

      setResult(data)
      setMessage("Document verified successfully")
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
      setResult(null)
    } finally {
      setIsChecking(false)
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "N/A"
    }

    return new Date(dateValue).toLocaleString()
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          SignifyPDF
        </h1>

        <Link
          to="/"
          className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
        >
          Back to Home
        </Link>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800">
            Verify Document
          </h2>

          <p className="mt-2 text-slate-600">
            Enter the verification ID to check whether a document exists in SignifyPDF.
          </p>

          <form onSubmit={handleVerify} className="mt-6">
            <label className="block text-sm font-medium text-slate-700">
              Verification ID
            </label>

            <input
              type="text"
              value={verificationId}
              onChange={(event) => setVerificationId(event.target.value)}
              placeholder="Example: SIG-ABC1234567"
              className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-700"
            />

            <button
              type="submit"
              disabled={isChecking}
              className="mt-5 w-full bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isChecking ? "Checking..." : "Verify Document"}
            </button>
          </form>
        </div>

        {message && (
          <div className="mt-6 bg-white rounded-xl shadow p-4">
            <p className="text-slate-700">
              {message}
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-600">
            <h3 className="text-xl font-bold text-green-700">
              Document Found
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold">File Name:</span>{" "}
                {result.original_filename}
              </p>

              <p>
                <span className="font-semibold">Status:</span>{" "}
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  {result.status}
                </span>
              </p>

              <p>
                <span className="font-semibold">Verification ID:</span>{" "}
                {result.verification_id}
              </p>

              <p>
                <span className="font-semibold">Uploaded At:</span>{" "}
                {formatDate(result.created_at)}
              </p>

              <p className="break-all">
                <span className="font-semibold">File Hash:</span>{" "}
                {result.file_hash}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default Verify