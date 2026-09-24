import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { scrollToTop } from '@/lib/scrollToTop'

/**
 * Opening another page starts it at the top. The page scrolls as a whole,
 * so without this, going from far down Transactions to the Dashboard kept
 * the old scroll position. Only a change of page counts: a filter that
 * only changes the query string leaves the position alone. Going back
 * (the browser's back button) is left to the browser, which puts the
 * previous page back where it was.
 */
function ScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const previousPathname = useRef(pathname)

  useLayoutEffect(() => {
    if (pathname === previousPathname.current) {
      return
    }
    previousPathname.current = pathname
    if (navigationType !== 'POP') {
      scrollToTop()
    }
  }, [pathname, navigationType])

  return null
}

export default ScrollToTopOnNavigate
