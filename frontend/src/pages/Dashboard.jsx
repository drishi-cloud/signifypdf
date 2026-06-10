import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCurrentUser() {
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/login")
        return
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          localStorage.removeItem("token")
          navigate("/login")
          return
        }

        setUser(data)
      } catch (error) {
        setMessage("Could not connect to backend")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [navigate])

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

      <section className="max-w-5xl mx-auto px-6 py-8">
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

          {message && (
            <p className="mt-4 text-red-600">
              {message}
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold text-slate-800">
              Upload PDFs
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Upload documents that need signatures.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold text-slate-800">
              Sign Documents
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Place signatures on PDF documents securely.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold text-slate-800">
              Audit Trail
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Track document activity and verification history.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Dashboard