import { Download, Monitor, Smartphone, TabletSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/InstallPromptContext'
import { cn } from '@/lib/utils'

const PLATFORMS = [
  {
    icon: Monitor,
    iconClassName: 'text-primary',
    title: 'Desktop',
    how: 'In Chrome or Edge, click the install button at the right of the address bar.',
  },
  {
    icon: TabletSmartphone,
    iconClassName: 'text-accent-2',
    title: 'iPhone and iPad',
    how: 'In Safari, tap Share, then Add to Home Screen.',
  },
  {
    icon: Smartphone,
    iconClassName: 'text-primary',
    title: 'Android',
    how: 'In Chrome, open the menu and tap Install app.',
  },
]

/**
 * The site installs as an app, which testers liked once they found it
 * (#43), so this says so and how, per platform. Where the browser can
 * install it directly, there's a button for that too.
 */
function UseAnywhereSection() {
  const { isInstalled, canPromptInstall, promptInstall } = useInstallPrompt()

  return (
    <section aria-labelledby="use-anywhere" className="flex flex-col items-center gap-8">
      <div className="flex max-w-2xl flex-col items-center gap-2 text-center">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
          Use it anywhere
        </span>
        <h2 id="use-anywhere" className="font-heading text-2xl font-semibold sm:text-3xl">
          In your browser, or <span className="text-primary">as an app</span>.
        </h2>
        <p className="text-base text-text-dim">
          Web3Spend installs like a regular app on your computer or phone: its own icon, its own
          window, and it keeps working offline once your data is in.
        </p>
      </div>

      <div className="relative w-full">
        <span
          aria-hidden="true"
          className="absolute inset-x-8 top-0 z-10 h-px bg-[linear-gradient(90deg,transparent,var(--color-primary),var(--color-accent-2),transparent)] opacity-60"
        />
        <ul className="grid w-full grid-cols-1 divide-y divide-white/5 rounded-2xl border border-[#161a24] bg-[#0d1016] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {PLATFORMS.map(({ icon: Icon, iconClassName, title, how }) => (
            <li key={title} className="flex items-start gap-3.5 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/15 to-accent-2/10">
                <Icon className={cn('size-5', iconClassName)} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-heading text-base font-semibold">{title}</span>
                <span className="text-sm text-text-dim">{how}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {canPromptInstall && !isInstalled && (
        <Button size="lg" onClick={promptInstall}>
          <Download />
          Install Web3Spend
        </Button>
      )}
    </section>
  )
}

export default UseAnywhereSection
