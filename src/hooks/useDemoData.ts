import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { openDemo } from '@/storage/demoData'
import { useDashboardFiltersOptional } from './DashboardFiltersContext'

/**
 * Opens the synthetic demo (see openDemo) and lands on the dashboard, same
 * destination a real import would reach. Shared by every "Try a demo"
 * entry point (Home, the Import screen) so they can't drift apart.
 *
 * The demo lives in its own database, so it opens whether or not the
 * person has real data, and theirs is left exactly as it was. AppShell's
 * DemoBanner says the demo is on screen and offers the way back.
 */
export function useDemoData() {
  const navigate = useNavigate()
  const filters = useDashboardFiltersOptional()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadDemo() {
    if (isLoading) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await openDemo()
      // The demo is rebuilt on every open, with new card IDs, so a card
      // picked the last time it was open would otherwise hide all of it.
      filters?.resetFilters()
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading the demo.')
      setIsLoading(false)
    }
  }

  return { loadDemo, isLoading, error }
}
