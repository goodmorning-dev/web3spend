import { LayoutDashboard, Receipt, Settings, Upload } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', end: false, label: 'Transactions', icon: Receipt },
  { to: '/app/import', end: false, label: 'Import', icon: Upload },
]

/**
 * A left sidebar on desktop; a bottom tab bar on phones (MVP-PLAN's phone
 * support requirement), same breakpoint as Tailwind's default `sm`.
 */
function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-row items-center justify-around gap-0 border-t border-sidebar-border bg-sidebar p-2 sm:w-56 sm:flex-col sm:items-stretch sm:justify-start sm:gap-6 sm:border-t-0 sm:border-r sm:p-4">
      <div className="hidden items-center gap-2.5 px-1.5 sm:flex">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-base font-bold text-primary-foreground">
          W
        </div>
        <span className="font-heading text-base font-semibold text-sidebar-foreground">
          Web3Spend
        </span>
      </div>

      <nav className="flex w-full flex-row justify-around gap-0.5 sm:flex-col sm:justify-start">
        {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10.5px] font-medium transition-colors sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
              )
            }
          >
            <Icon className="size-[17px] shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto hidden items-center gap-2.5 px-3 py-2 text-sm font-medium text-text-faint sm:flex">
        <Settings className="size-4 shrink-0" />
        <span>Settings</span>
      </div>
    </aside>
  )
}

export default Sidebar
