import { Info } from 'lucide-react'
import { RECENT_CHARGE_WINDOW_DAYS } from '@/analyzers'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const DETECTION_POINTS = [
  'A merchant shows up here once it has charged the exact same amount on the same day of the month, in at least two different months.',
  "We look at your full history in this currency, so the period filter doesn't apply on this page.",
  `"No recent charge" means nothing from it in the last ${RECENT_CHARGE_WINDOW_DAYS} days of your data. It may have been cancelled, or it may just be billing late.`,
  'A one-off purchase that happens to repeat can look like a subscription, and a real one that moves by a day or skips a short month can be missed. Double-check anything you are not sure about.',
]

/**
 * detectSubscriptions is a guess built from a pattern in the data, not
 * something Etherfi or any card network actually labels as a subscription.
 * The one-line note keeps that visible on every visit; the popover holds the
 * full explanation for anyone who wants to know how the guess is made.
 */
function DetectionNote() {
  return (
    <div className="flex items-start gap-2 text-[13px] text-text-dim">
      <Info className="mt-0.5 size-4 shrink-0 text-text-faint" />
      <p>
        These are patterns we spotted, not confirmed subscriptions.{' '}
        <Popover>
          <PopoverTrigger className="cursor-pointer font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
            How we detect these
          </PopoverTrigger>
          <PopoverContent align="start" className="w-96">
            <h4 className="text-sm font-semibold text-foreground">How we detect these</h4>
            <ul className="mt-2.5 flex flex-col gap-2">
              {DETECTION_POINTS.map((point) => (
                <li
                  key={point}
                  className="relative pl-4 text-[12.5px] leading-relaxed text-text-dim before:absolute before:top-[7px] before:left-0 before:size-[5px] before:rounded-full before:bg-primary before:content-['']"
                >
                  {point}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </p>
    </div>
  )
}

export default DetectionNote
