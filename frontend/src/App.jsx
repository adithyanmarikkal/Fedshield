import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import AdminHome from './pages/AdminHome.jsx'
import UserHome from './pages/UserHome.jsx'
import Blockchain from './pages/Blockchain.jsx'

/** Allow any authenticated wallet */
function PrivateRoute({ children }) {
  return localStorage.getItem('account') ? children : <Navigate to="/login" replace />
}

/** Allow only the contract owner */
function AdminRoute({ children }) {
  if (!localStorage.getItem('account')) return <Navigate to="/login" replace />
  if (localStorage.getItem('isOwner') !== 'true') return <Navigate to="/home" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        {/* Admin dashboard — only for contract owner */}
        <Route path="/admin" element={<AdminRoute><AdminHome /></AdminRoute>} />
        {/* User dashboard — any authenticated wallet */}
        <Route path="/home" element={<PrivateRoute><UserHome /></PrivateRoute>} />
        {/* Blockchain detail page — any authenticated wallet */}
        <Route path="/blockchain" element={<PrivateRoute><Blockchain /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
