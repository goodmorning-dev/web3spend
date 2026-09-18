import { Outlet } from 'react-router-dom'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/**
 * The layout for everything under /app: sidebar navigation, the shared
 * currency/card/period filters (MVP-PLAN §5), and the topbar. Individual
 * pages render into the Outlet below.
 */
function AppShell() {
  return (
    <DashboardFiltersProvider>
      <div className="relative isolate flex min-h-screen flex-col-reverse bg-background text-foreground sm:flex-row">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[260px] -left-[220px] -z-10 size-[820px] bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_65%)] opacity-[0.28]"
        />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
          <Topbar />
          <Outlet />
        </div>
      </div>
    </DashboardFiltersProvider>
  )
}

export default AppShell
