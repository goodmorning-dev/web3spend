import { useEffect } from 'react'

/** The same title index.html ships with, for the home page. */
export const HOME_TITLE = 'Web3Spend: private spending insights for your ether.fi card'

/**
 * Sets the browser tab's title for the page being shown: "Transactions ·
 * Web3Spend", or the full home title when `pageTitle` is omitted. Each
 * page's own title also helps history, bookmarks and the installed app's
 * window title tell pages apart.
 */
export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · Web3Spend` : HOME_TITLE
  }, [pageTitle])
}
