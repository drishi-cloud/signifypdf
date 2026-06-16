import { Route, Routes } from "react-router-dom"

import Home from "./pages/Home.jsx"
import Register from "./pages/Register.jsx"
import Login from "./pages/Login.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import DocumentPreview from "./pages/DocumentPreview.jsx"
import Verify from "./pages/Verify.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/documents/:id" element={<DocumentPreview />} />
      <Route path="/verify" element={<Verify />} />
    </Routes>
  )
}

export default App