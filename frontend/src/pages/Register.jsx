import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

const API_BASE_URL = "http://127.0.0.1:8000"

function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  async function handleRegister(event) {
    event.preventDefault()

    if (!name.trim() || !email.trim() || !password.trim()) {
      setMessage("Please fill all fields")
      return
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters")
      return
    }

    setIsRegistering(true)
    setMessage("Creating account...")

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.detail || "Could not register user")
        return
      }

      setMessage("Registration successful! Redirecting to login...")

      setTimeout(() => {
        navigate("/login")
      }, 1000)
    } catch (error) {
      setMessage("Backend is not running or something went wrong")
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-800 text-center">
          Create Account
        </h1>

        <p className="mt-2 text-center text-slate-600">
          Register to start signing PDF documents.
        </p>

        <form onSubmit={handleRegister} className="mt-6">
          <label className="block text-sm font-medium text-slate-700">
            Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />

          <label className="block text-sm font-medium text-slate-700 mt-4">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />

          <label className="block text-sm font-medium text-slate-700 mt-4">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
            className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />

          <button
            type="submit"
            disabled={isRegistering}
            className="mt-6 w-full bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRegistering ? "Creating..." : "Register"}
          </button>
        </form>

        {message && (
          <div className="mt-5 bg-slate-50 rounded-xl p-4">
            <p className="text-slate-700 text-sm">
              {message}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-slate-900 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Register