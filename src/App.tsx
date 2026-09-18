import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from '@/components/pages/DashboardPage'
import ImportPage from '@/components/pages/ImportPage'
import TransactionsPage from '@/components/pages/TransactionsPage'
import AppShell from '@/components/shell/AppShell'
import Home from '@/components/Home'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="import" element={<ImportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
