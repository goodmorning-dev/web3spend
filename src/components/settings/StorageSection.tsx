import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  estimateUsageBytes,
  getPersistenceState,
  requestPersistentStorage,
  type PersistenceState,
} from '@/storage/persistence'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Whether the browser has agreed to keep this site's data (see
 * persistence.ts), with a way to ask again, since the answer can change:
 * installing the app or using it regularly often turns a no into a yes.
 */
function StorageSection() {
  const [state, setState] = useState<PersistenceState | null>(null)
  const [usageBytes, setUsageBytes] = useState<number | null>(null)
  const [asking, setAsking] = useState(false)
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getPersistenceState(), estimateUsageBytes()])
      .then(([persistence, usage]) => {
        if (!cancelled) {
          setState(persistence)
          setUsageBytes(usage)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState('unsupported')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function askToKeep() {
    setAsking(true)
    try {
      const result = await requestPersistentStorage()
      setState(result)
      setDeclined(result === 'not-persisted')
    } catch {
      setDeclined(true)
    } finally {
      setAsking(false)
    }
  }

  if (state === null) {
    return null
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-heading text-sm font-semibold">Storage</h2>

      {state === 'persisted' && (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-positive">
            <ShieldCheck className="size-4" />
            Your data is set to be kept.
          </p>
          <p className="max-w-prose text-sm text-text-faint">
            The browser won't clear it to free up space. Only deleting it yourself, below, removes
            it.
          </p>
        </>
      )}

      {state === 'not-persisted' && (
        <>
          <p className="max-w-prose text-sm text-text-faint">
            Your browser may clear this data on its own if the device runs low on space. Asking it
            to keep the data prevents that.
          </p>
          {declined && (
            <p className="max-w-prose text-sm text-text-dim">
              Your browser said no for now. Installing Web3Spend as an app, or using it regularly,
              often changes that.
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={asking}
            onClick={askToKeep}
          >
            <ShieldCheck className="size-3.5" />
            Keep my data
          </Button>
        </>
      )}

      {state === 'unsupported' && (
        <p className="max-w-prose text-sm text-text-faint">
          This browser doesn't let sites ask to keep their data, so it may clear it if the device
          runs low on space. Re-importing your ether.fi export brings it back.
        </p>
      )}

      {usageBytes !== null && (
        <p className="text-xs text-text-faint">
          Using about {formatBytes(usageBytes)} on this device.
        </p>
      )}
    </section>
  )
}

export default StorageSection
