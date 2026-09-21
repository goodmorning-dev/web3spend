import { ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { deleteAllData } from '@/storage/deleteAllData'

/**
 * MVP-PLAN §5: "Delete all local financial data after confirmation. This is
 * the only data-management control in the MVP." Everything here is scoped
 * to this one browser; there's no server copy and no cross-device sync to
 * warn about beyond that.
 */
function SettingsPage() {
  const { resetFilters } = useDashboardFilters()
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setError(null)
    try {
      await deleteAllData()
      // A card/currency/period override selected before deleting would
      // otherwise survive as a stale filter; a later re-import assigns new
      // card IDs, so that leftover override would silently filter out
      // every transaction it produces.
      resetFilters()
      setDeleted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? `We couldn't delete your data: ${err.message}. Nothing was changed; you can try again.`
          : "We couldn't delete your data. Nothing was changed; you can try again.",
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold">Delete all data</h2>
        <p className="max-w-prose text-sm text-text-faint">
          Everything Web3Spend knows, every card, transaction, and import record, is stored only in
          this browser on this device, in its IndexedDB database. Deleting it removes that data
          permanently; there's no server copy to restore it from, and it has no effect on any other
          browser or device you've used this app on, including a separate install on your phone.
          Re-importing your Etherfi export afterward rebuilds your data from scratch.
        </p>

        {deleted ? (
          <p className="flex items-center gap-2 text-sm font-medium text-positive">
            <ShieldCheck className="size-4" />
            All local data has been deleted.
          </p>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="self-start">
                <Trash2 className="size-3.5" />
                Delete all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all local data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes every card, transaction, and import record stored in this
                  browser. It cannot be undone from within the app; you'd need to re-import your
                  Etherfi export to see your data again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}

export default SettingsPage
