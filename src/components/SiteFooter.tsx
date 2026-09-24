import logoImage from '@/assets/logo.webp'
import { GithubLogoIcon } from '@/components/home/BrandIcons'
import { GOODMORNING_URL, REPO_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

const LINK_CLASS = 'font-medium text-text-dim hover:text-primary'

/**
 * The same footer on the home page and under every page of the app: who
 * made it on the left, the source on the right. `className` sizes the
 * inner row to fit where it sits (the home page centers it at the page's
 * width; the app lets it span the content column).
 */
function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className="border-t border-border">
      <div
        className={cn(
          'flex flex-col items-center gap-3 text-sm text-text-faint sm:flex-row sm:justify-between',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="" className="size-6 shrink-0" />
          <span className="font-heading text-sm font-semibold text-foreground">Web3Spend</span>
          <span>
            Made by{' '}
            <a href={GOODMORNING_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
              goodmorning.dev
            </a>
          </span>
        </div>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className={cn('flex items-center gap-1.5', LINK_CLASS)}
        >
          <GithubLogoIcon className="size-4" />
          Source on GitHub
        </a>
      </div>
    </footer>
  )
}

export default SiteFooter
