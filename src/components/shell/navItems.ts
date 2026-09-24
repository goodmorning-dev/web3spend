import { LayoutDashboard, Receipt, Repeat, Settings, Upload } from 'lucide-react'

/** Shared by the desktop Sidebar and the phone MobileTabBar so the two
 * can't drift apart. Settings sits in the same list as everything else
 * rather than pinned off on its own, where it was easy to miss. */
export const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', end: false, label: 'Transactions', icon: Receipt },
  { to: '/app/subscriptions', end: false, label: 'Subscriptions', icon: Repeat },
  { to: '/app/import', end: false, label: 'Import', icon: Upload },
  { to: '/app/settings', end: false, label: 'Settings', icon: Settings },
]

export type NavItem = (typeof NAV_ITEMS)[number]

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`)
}
