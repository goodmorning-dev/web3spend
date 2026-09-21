import { LayoutDashboard, Receipt, Repeat, Settings, Upload } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logoImage from '@/assets/logo.webp'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', end: false, label: 'Transactions', icon: Receipt },
  { to: '/app/subscriptions', end: false, label: 'Subscriptions', icon: Repeat },
  { to: '/app/import', end: false, label: 'Import', icon: Upload },
]

const SETTINGS_ITEM = { to: '/app/settings', end: false, label: 'Settings', icon: Settings }

const NAV_LINK_CLASS =
  'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10.5px] font-medium transition-colors sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm'

function navLinkTone(isActive: boolean): string {
  return isActive
    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
}

/**
 * A left sidebar on desktop; a bottom tab bar on phones (MVP-PLAN's phone
 * support requirement), same breakpoint as Tailwind's default `sm`. Settings
 * rides along as a fourth tab on the phone bar, but gets its own bottom-
 * pinned spot on desktop instead of sitting in that same primary list.
 */
function Sidebar() {
  return (
    <aside className="sticky bottom-0 z-20 flex w-full shrink-0 flex-row items-center justify-around gap-0 border-t border-sidebar-border bg-sidebar p-2 sm:top-0 sm:bottom-auto sm:h-screen sm:w-56 sm:flex-col sm:items-stretch sm:justify-start sm:gap-6 sm:border-t-0 sm:border-r sm:p-4">
      <div className="hidden items-center gap-2.5 px-1.5 sm:flex">
        <img src={logoImage} alt="" className="size-8 shrink-0" />
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
            className={({ isActive }) => cn(NAV_LINK_CLASS, navLinkTone(isActive))}
          >
            <Icon className="size-[17px] shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink
          to={SETTINGS_ITEM.to}
          className={({ isActive }) => cn(NAV_LINK_CLASS, 'sm:hidden', navLinkTone(isActive))}
        >
          <Settings className="size-[17px] shrink-0" />
          <span>{SETTINGS_ITEM.label}</span>
        </NavLink>
      </nav>

      <NavLink
        to={SETTINGS_ITEM.to}
        className={({ isActive }) =>
          cn(
            'mt-auto hidden items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-text-faint hover:text-sidebar-foreground',
          )
        }
      >
        <Settings className="size-4 shrink-0" />
        <span>Settings</span>
      </NavLink>
    </aside>
  )
}

export default Sidebar
