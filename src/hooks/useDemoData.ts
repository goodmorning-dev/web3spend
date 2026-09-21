import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDemoRows, DEMO_FILE_HASH, DEMO_PARSER_VERSION } from '@/adapters/demoData'
import { commitImport } from '@/matching/commitImport'

/**
 * Loads the synthetic demo dataset through the exact same commitImport
 * pipeline a real file import uses, then lands on the dashboard, same
 * destination a real import would reach. Shared by every "Try a demo"
 * entry point (Home, the Import screen) so they can't drift apart.
 */
export function useDemoData() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadDemo() {
    if (isLoading) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await commitImport(buildDemoRows(), {
        fileHash: DEMO_FILE_HASH,
        parserVersion: DEMO_PARSER_VERSION,
        unsupportedCount: 0,
      })
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading the demo.')
      setIsLoading(false)
    }
  }

  return { loadDemo, isLoading, error }
}
