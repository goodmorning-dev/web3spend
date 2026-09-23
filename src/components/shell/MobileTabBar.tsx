import { NavLink, useLocation } from 'react-router-dom'
import { useCollapseOnScroll } from '@/hooks/useCollapseOnScroll'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './navItems'

// iOS-style ease-out: quick to respond, gentle to settle.
const EASE = 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none'

function isTabActive(tab: (typeof NAV_ITEMS)[number], pathname: string): boolean {
  return tab.end ? pathname === tab.to : pathname === tab.to || pathname.startsWith(`${tab.to}/`)
}

/**
 * The phone navigation (below Tailwind's `sm`), modelled on Revolut's tab
 * bar: a floating glass pill with all five tabs and a highlight that slides
 * to the active one. Scrolling down shrinks the pill and folds the labels
 * away, leaving every icon tappable; scrolling up brings the labels back
 * (see useCollapseOnScroll). Tabs split the pill's width equally, and the
 * pill never grows past the viewport, so it fits down to a 320px screen.
 */
function MobileTabBar() {
  const { pathname } = useLocation()
  const collapsed = useCollapseOnScroll(pathname)
  const activeIndex = NAV_ITEMS.findIndex((tab) => isTabActive(tab, pathname))

  return (
    <div className="sm:hidden">
      {/* Content fades out behind the bar instead of meeting a hard edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-background/95 via-background/60 to-transparent"
      />
      <nav
        aria-label="Tab bar"
        data-collapsed={collapsed}
        className={cn(
          'fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-card p-1 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl backdrop-saturate-150 transition-[width]',
          EASE,
          // Collapsing trims only ~20px off each side; most of the shrink
          // is in height, where the labels were.
          collapsed ? 'w-[min(calc(100vw-56px),344px)]' : 'w-[min(calc(100vw-16px),384px)]',
        )}
      >
        <div className="relative grid grid-cols-5">
          {activeIndex >= 0 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-0 left-0 w-1/5 rounded-full bg-primary/15 ring-1 ring-primary/25 ring-inset transition-transform',
                EASE,
              )}
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
          )}
          {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center rounded-full transition-[padding,color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  EASE,
                  collapsed ? 'py-[11px]' : 'py-[7px]',
                  isActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              {/* A 1fr/0fr grid row animates the label's height away
                  smoothly; it stays in the DOM so each tab keeps its
                  accessible name while collapsed. */}
              <span
                className={cn(
                  'grid transition-[grid-template-rows,opacity]',
                  EASE,
                  collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
                )}
              >
                <span className="overflow-hidden">
                  <span className="block pt-1 text-[10px] leading-3 font-semibold tracking-[-0.02em] whitespace-nowrap max-[359px]:text-[9.5px]">
                    {label}
                  </span>
                </span>
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default MobileTabBar
