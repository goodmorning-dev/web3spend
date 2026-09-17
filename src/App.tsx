import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from '@/components/Dashboard'
import Home from '@/components/Home'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/app" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
