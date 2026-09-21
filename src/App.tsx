import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from '@/components/pages/DashboardPage'
import ImportPage from '@/components/pages/ImportPage'
import SettingsPage from '@/components/pages/SettingsPage'
import TransactionsPage from '@/components/pages/TransactionsPage'
import AppShell from '@/components/shell/AppShell'
import Home from '@/components/Home'
import { InstallPromptProvider } from '@/hooks/InstallPromptContext'

function App() {
  return (
    // Above the router, not inside any one route: the browser can fire
    // beforeinstallprompt as early as page load, on whichever route a
    // visitor lands on first (Home included), and only ever once per page
    // load - a listener scoped to Settings alone would miss it for anyone
    // who hasn't already navigated there.
    <InstallPromptProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </InstallPromptProvider>
  )
}

export default App
