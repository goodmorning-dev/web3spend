import { FlaskConical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useDataSource, useHasRealData } from '@/hooks/useDataSource'
import { setDataSource } from '@/storage/dataSource'

/**
 * Says so whenever the demo is on screen, so its numbers are never taken
 * for the person's own, with the way out: back to their own data if they
 * have any, or out of the demo to the dashboard's import prompt if not.
 */
function DemoBanner() {
  const source = useDataSource()
  const hasRealData = useHasRealData()
  const navigate = useNavigate()

  // Waits for hasRealData too, so the button never flickers from one
  // label to the other while that's being read.
  if (source !== 'demo' || hasRealData === undefined) {
    return null
  }

  function leaveDemo() {
    setDataSource('real')
    if (!hasRealData) {
      navigate('/app')
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-primary/30 bg-primary/10 py-2 pr-2 pl-4"
    >
      <p className="flex items-center gap-2 text-sm">
        <FlaskConical className="size-4 shrink-0 text-primary" />
        {hasRealData
          ? "You're looking at demo data, not your own."
          : "You're looking at demo data."}
      </p>
      <Button type="button" size="sm" variant="destructive" onClick={leaveDemo}>
        {hasRealData ? 'Back to your data' : 'Exit demo'}
      </Button>
    </div>
  )
}

export default DemoBanner
