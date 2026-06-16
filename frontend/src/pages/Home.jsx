import { Link } from "react-router-dom"

function Home() {
  return (
    <main className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-800">
          SignifyPDF
        </h1>
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-lg p-10 text-center">
          <h2 className="text-4xl font-bold text-slate-800">
            Secure PDF Signing and Verification System
          </h2>

          <p className="mt-5 text-slate-600 text-lg max-w-2xl mx-auto">
            Upload PDF documents, place typed, drawn, or uploaded signatures,
            generate signed PDFs, and verify documents using a unique verification ID.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700"
            >
              Create Account
            </Link>

            <Link
              to="/login"
              className="border border-slate-800 text-slate-800 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100"
            >
              Login
            </Link>

            <Link
              to="/verify"
              className="border border-green-700 text-green-700 px-6 py-3 rounded-lg font-semibold hover:bg-green-50"
            >
              Verify Document
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800">
              Upload PDF
            </h3>

            <p className="mt-3 text-slate-600">
              Upload PDF files securely with file type and size validation.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800">
              Add Signature
            </h3>

            <p className="mt-3 text-slate-600">
              Add typed, drawn, or uploaded signatures using drag and drop.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800">
              Verify Document
            </h3>

            <p className="mt-3 text-slate-600">
              Verify a document using its unique verification ID.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home