import { Download, Monitor, Smartphone, TabletSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/InstallPromptContext'

const PLATFORMS = [
  {
    icon: Monitor,
    title: 'Desktop',
    how: 'In Chrome or Edge, click the install button at the right of the address bar.',
  },
  {
    icon: TabletSmartphone,
    title: 'iPhone and iPad',
    how: 'In Safari, tap Share, then Add to Home Screen.',
  },
  {
    icon: Smartphone,
    title: 'Android',
    how: 'In Chrome, open the menu and tap Install app.',
  },
]

/**
 * The site installs as an app, which testers liked once they found it
 * (#43), so this says so and how, per platform: the text on the left (with
 * an install button where the browser can install it directly), and the
 * platforms stacked on the right, set off by a gradient line along their
 * left edge. Stacked text-first on phones. The icons sit in the same
 * frames as the "How it works" steps.
 */
function UseAnywhereSection() {
  const { isInstalled, canPromptInstall, promptInstall } = useInstallPrompt()

  return (
    <section
      aria-labelledby="use-anywhere"
      className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12"
    >
      <div className="flex flex-col items-start gap-3">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
          Use it anywhere
        </span>
        <h2 id="use-anywhere" className="font-heading text-2xl font-semibold sm:text-3xl">
          In your browser, or <span className="text-primary">as an app</span>.
        </h2>
        <p className="max-w-md text-base text-text-dim">
          Web3Spend installs like a regular app on your computer or phone: its own icon, its own
          window, and it keeps working offline once your data is in.
        </p>
        {canPromptInstall && !isInstalled && (
          <Button size="lg" className="mt-2" onClick={promptInstall}>
            <Download />
            Install Web3Spend
          </Button>
        )}
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute inset-y-6 left-0 z-10 w-px bg-[linear-gradient(180deg,transparent,var(--color-primary),var(--color-accent-2),transparent)] opacity-60"
        />
        <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-[#161a24] bg-[#0d1016]">
          {PLATFORMS.map(({ icon: Icon, title, how }) => (
            <li key={title} className="flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-secondary bg-gradient-to-br from-accent-2/20 to-accent-2/5">
                <Icon className="size-5 text-accent-2" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-heading text-base font-semibold">{title}</span>
                <span className="text-sm text-text-dim">{how}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default UseAnywhereSection
