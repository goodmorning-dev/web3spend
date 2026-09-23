import { LayoutDashboard, Receipt, Repeat, Settings, Upload } from 'lucide-react'

/** Shared by the desktop Sidebar and the phone MobileTabBar so the two
 * can't drift apart. */
export const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', end: false, label: 'Transactions', icon: Receipt },
  { to: '/app/subscriptions', end: false, label: 'Subscriptions', icon: Repeat },
  { to: '/app/import', end: false, label: 'Import', icon: Upload },
]

export const SETTINGS_ITEM = { to: '/app/settings', end: false, label: 'Settings', icon: Settings }
