function App() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <section className="bg-white shadow-lg rounded-2xl p-8 max-w-xl text-center">
        <h1 className="text-4xl font-bold text-slate-800">
          SignifyPDF
        </h1>

        <p className="mt-4 text-slate-600">
          Secure PDF Signing & Verification System
        </p>

        <div className="mt-6 flex gap-4 justify-center">
          <button className="bg-slate-800 text-white px-5 py-2 rounded-lg">
            Login
          </button>

          <button className="border border-slate-800 text-slate-800 px-5 py-2 rounded-lg">
            Register
          </button>
        </div>
      </section>
    </main>
  )
}

export default App