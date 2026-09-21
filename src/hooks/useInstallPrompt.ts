import { useEffect, useState } from 'react'

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

export function isIosSafari(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
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

/**
 * MVP-PLAN §5 Milestone 3: "Add the PWA manifest, icons, and installation
 * guidance." Chrome/Edge/Android supply a native `beforeinstallprompt`
 * event this wraps into a button; iOS Safari never fires it (see
 * `isIosSafari`), so SettingsPage shows manual steps there instead of a
 * button that would otherwise silently do nothing.
 */
export function useInstallPrompt(): InstallPromptState {
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

  return { isInstalled, canPromptInstall: deferredEvent !== null, promptInstall }
}
