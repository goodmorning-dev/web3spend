import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallPromptProvider, isIosDevice, useInstallPrompt } from './InstallPromptContext'

interface FakeInstallPromptFields {
  preventDefault?: () => void
  prompt?: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function dispatchBeforeInstallPrompt(overrides: FakeInstallPromptFields = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, { preventDefault: () => {}, ...overrides })
  window.dispatchEvent(event)
}

function renderWithProvider() {
  return renderHook(() => useInstallPrompt(), {
    wrapper: ({ children }) => <InstallPromptProvider>{children}</InstallPromptProvider>,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useInstallPrompt', () => {
  it('throws when used outside an InstallPromptProvider', () => {
    expect(() => renderHook(() => useInstallPrompt())).toThrow(
      /must be used within an InstallPromptProvider/,
    )
  })

  it('starts with no prompt available and not installed', () => {
    const { result } = renderWithProvider()
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('offers to prompt once the browser fires beforeinstallprompt, and prevents its default mini-infobar', () => {
    const { result } = renderWithProvider()

    let prevented = false
    act(() => {
      dispatchBeforeInstallPrompt({ preventDefault: () => (prevented = true) })
    })

    expect(prevented).toBe(true)
    expect(result.current.canPromptInstall).toBe(true)
  })

  it('marks the app installed once accepted, and consumes the one-time prompt', async () => {
    const { result } = renderWithProvider()
    const prompt = vi.fn().mockResolvedValue(undefined)
    const userChoice = Promise.resolve({ outcome: 'accepted' as const })

    act(() => {
      dispatchBeforeInstallPrompt({ prompt, userChoice })
    })
    expect(result.current.canPromptInstall).toBe(true)

    await act(() => result.current.promptInstall())

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('does not mark the app installed when the prompt is dismissed', async () => {
    const { result } = renderWithProvider()
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const })

    act(() => {
      dispatchBeforeInstallPrompt({ prompt: vi.fn().mockResolvedValue(undefined), userChoice })
    })

    await act(() => result.current.promptInstall())

    expect(result.current.isInstalled).toBe(false)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('marks the app installed when the browser fires appinstalled directly', () => {
    const { result } = renderWithProvider()

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.isInstalled).toBe(true)
  })

  it('retains an event captured on one page across navigation to another, since the provider lives above the router', () => {
    // Regression test: mounting the provider only inside Settings meant a
    // beforeinstallprompt fired while on Home or Dashboard was lost outright,
    // and even a later visit to Settings started a fresh listener that
    // missed the (already-fired-once) event. Simulates that by capturing
    // the event while a stand-in "Home" is the only child, then swapping to
    // a stand-in "Settings" without unmounting the provider itself - the
    // same relationship App.tsx has between InstallPromptProvider and Routes.
    function HomeStandIn() {
      return <div>home</div>
    }
    function SettingsStandIn() {
      const { canPromptInstall } = useInstallPrompt()
      return <div>{canPromptInstall ? 'can install' : 'cannot install'}</div>
    }

    const { rerender } = render(
      <InstallPromptProvider>
        <HomeStandIn />
      </InstallPromptProvider>,
    )

    act(() => dispatchBeforeInstallPrompt())

    rerender(
      <InstallPromptProvider>
        <SettingsStandIn />
      </InstallPromptProvider>,
    )

    expect(screen.getByText('can install')).toBeInTheDocument()
  })
})

describe('isIosDevice', () => {
  it('recognizes an iPhone/iPad user agent', () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    expect(isIosDevice()).toBe(true)
  })

  it('recognizes an iPad in desktop mode, whose UA otherwise claims to be a Mac', () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      maxTouchPoints: 5,
    })
    expect(isIosDevice()).toBe(true)
  })

  it('does not flag a real Mac, which reports no touch points', () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      maxTouchPoints: 0,
    })
    expect(isIosDevice()).toBe(false)
  })

  it('does not flag an ordinary desktop user agent', () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    })
    expect(isIosDevice()).toBe(false)
  })
})
