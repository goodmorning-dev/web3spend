import { Link, useLocation } from 'react-router-dom'
import logoImage from '@/assets/logo.webp'
import { GithubLogoIcon } from '@/components/home/BrandIcons'
import { scrollToTop } from '@/lib/scrollToTop'
import { cn } from '@/lib/utils'

const REPO_URL = 'https://github.com/goodmorning-dev/web3spend'
const GOODMORNING_URL = 'https://goodmorning.dev'

const LINK_CLASS = 'font-medium text-text-dim hover:text-primary'

/**
 * The same footer on the home page and under every page of the app: who
 * made it on the left, the source on the right. The logo goes to the home
 * page, as the sidebar's does; on the home page itself it glides back to
 * the top. `className` sizes the inner row to fit where it sits (the home
 * page centers it at the page's width; the app lets it span the content
 * column).
 */
function SiteFooter({ className }: { className?: string }) {
  const { pathname } = useLocation()

  return (
    <footer className="border-t border-border">
      <div
        className={cn(
          'flex flex-col items-center gap-3 text-sm text-text-faint sm:flex-row sm:justify-between',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Link
            to="/home"
            aria-label="Web3Spend home"
            onClick={() => {
              if (pathname === '/home') {
                scrollToTop({ smooth: true })
              }
            }}
            className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <img src={logoImage} alt="" className="size-6 shrink-0" />
            <span className="font-heading text-sm font-semibold text-foreground">Web3Spend</span>
          </Link>
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
