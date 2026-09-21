import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/** Chrome/Edge/Android's own install-prompt event; not yet in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari's own non-standard flag for a home-screen-launched app;
    // it never fires `display-mode: standalone` the way Chrome does.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * True for an iPhone/iPod outright, and for an iPad even in its default
 * "desktop" mode. Since iPadOS 13, Safari's own UA string claims to be a
 * Mac ("Macintosh; Intel Mac OS X ...") and is indistinguishable from a
 * real Mac by UA alone; WebKit's own guidance is that a "Mac" reporting
 * more than one touch point is really an iPad, since an actual Mac never
 * reports touch points at all.
 */
export function isIosDevice(): boolean {
  const ua = window.navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) {
    return true
  }
  return /macintosh|mac os x/i.test(ua) && window.navigator.maxTouchPoints > 1
}

export interface InstallPromptState {
  /** True once the app is already running installed (standalone), on any
   * platform; nothing else here has anything left to offer at that point. */
  isInstalled: boolean
  /** True when the browser itself offered an install prompt (Chrome, Edge,
   * Android) and it hasn't been used yet. */
  canPromptInstall: boolean
  /** Triggers the browser's own install prompt. A no-op if none is available. */
  promptInstall: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptState | null>(null)

/**
 * MVP-PLAN §5 Milestone 3: "Add the PWA manifest, icons, and installation
 * guidance." Mounted once at the app root (not inside Settings): the
 * browser fires `beforeinstallprompt` as early as page load, on whichever
 * route a visitor happens to land on first, and only ever fires it once
 * per page load, so a listener that only exists while Settings is mounted
 * would miss it entirely for anyone who hasn't already navigated there.
 */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      // Stops the browser's own mini-infobar so the app's own UI is the
      // only prompt a person sees.
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }
    function handleInstalled() {
      setIsInstalled(true)
      setDeferredEvent(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!deferredEvent) {
      return
    }
    await deferredEvent.prompt()
    const { outcome } = await deferredEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    // Chrome only ever fires beforeinstallprompt once per page load; either
    // way, this exact prompt can't be reused after it's been responded to.
    setDeferredEvent(null)
  }

  const value: InstallPromptState = {
    isInstalled,
    canPromptInstall: deferredEvent !== null,
    promptInstall,
  }

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>
}

export function useInstallPrompt(): InstallPromptState {
  const context = useContext(InstallPromptContext)
  if (!context) {
    throw new Error('useInstallPrompt must be used within an InstallPromptProvider')
  }
  return context
}
