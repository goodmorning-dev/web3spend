import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDemoRows, DEMO_FILE_HASH, DEMO_PARSER_VERSION } from '@/adapters/demoData'
import { useDashboardFiltersOptional } from './DashboardFiltersContext'
import { commitImport } from '@/matching/commitImport'
import { hasRealData } from '@/storage/demoData'
import { isQuotaExceededError, STORAGE_FULL_MESSAGE } from '@/storage/persistence'
import { trackImport } from './importActivity'

/**
 * Loads the synthetic demo dataset through the exact same commitImport
 * pipeline a real file import uses, then lands on the dashboard, same
 * destination a real import would reach. Shared by every "Try a demo"
 * entry point (Home, the Import screen) so they can't drift apart.
 *
 * MVP-PLAN §5 calls the demo "a separate, disposable dataset": it refuses
 * to load once any real import exists, rather than silently mixing
 * synthetic rows into someone's real spending. See src/storage/demoData.ts
 * for the other half of that guarantee (ImportFlow clears the demo the
 * moment a real import commits).
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
      if (await hasRealData()) {
        setError(
          "You already have real transactions imported, so the demo can't be loaded on top of them. Delete your data in Settings first if you want to try the demo.",
        )
        setIsLoading(false)
        return
      }
      await trackImport(() =>
        commitImport(buildDemoRows(), {
          fileHash: DEMO_FILE_HASH,
          parserVersion: DEMO_PARSER_VERSION,
          unsupportedCount: 0,
        }),
      )
      // Any currency/card override left over from a previous session would
      // otherwise silently hide the demo's data (it's all EUR, on cards
      // that didn't exist before), same reasoning as resetFilters' other
      // caller in Settings' delete-all-data flow.
      filters?.resetFilters()
      navigate('/app')
    } catch (err) {
      setError(
        isQuotaExceededError(err)
          ? STORAGE_FULL_MESSAGE
          : err instanceof Error
            ? err.message
            : 'Something went wrong loading the demo.',
      )
      setIsLoading(false)
    }
  }

  return { loadDemo, isLoading, error }
}
