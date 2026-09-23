import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { useImportInProgress } from '@/hooks/importActivity'

// A tab or installed app can stay open for days; checking hourly means it
// still hears about a new version without waiting for the next reload.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

interface UpdatePromptViewProps {
  importing: boolean
  onReload: () => void
  onDismiss: () => void
}

export function UpdatePromptView({ importing, onReload, onDismiss }: UpdatePromptViewProps) {
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-secondary p-3 shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0"
    >
      <RefreshCw className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">A new version of Web3Spend is ready.</p>
      <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
        Later
      </Button>
      <Button type="button" size="sm" disabled={importing} onClick={onReload}>
        {importing ? 'Finishing import…' : 'Reload'}
      </Button>
    </div>
  )
}

/**
 * MVP-PLAN §9: an app update must never interrupt an import. The service
 * worker waits (registerType: 'prompt' in vite.config.ts) instead of taking
 * over and reloading the page by itself; this offers the reload and lets
 * people pick the moment, with the button disabled while an import runs.
 */
function UpdatePrompt() {
  const importing = useImportInProgress()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS)
      }
    },
  })

  if (!needRefresh) {
    return null
  }
  return (
    <UpdatePromptView
      importing={importing}
      onReload={() => void updateServiceWorker(true)}
      onDismiss={() => setNeedRefresh(false)}
    />
  )
}

export default UpdatePrompt
