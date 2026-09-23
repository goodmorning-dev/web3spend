import { Link, NavLink } from 'react-router-dom'
import logoImage from '@/assets/logo.webp'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './navItems'

/**
 * The left sidebar from Tailwind's `sm` breakpoint up; phones get
 * MobileTabBar instead. The logo takes you back to the home page, as it
 * does in most apps.
 */
function Sidebar() {
  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 sm:flex">
      <Link
        to="/home"
        aria-label="Web3Spend home"
        className="flex items-center gap-2.5 self-start rounded-lg px-1.5 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <img src={logoImage} alt="" className="size-8 shrink-0" />
        <span className="font-heading text-base font-semibold text-sidebar-foreground">
          Web3Spend
        </span>
      </Link>

      <nav aria-label="Sidebar" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
    </aside>
  )
}

export default Sidebar
