import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isIosSafari, useInstallPrompt } from './useInstallPrompt'

function dispatchBeforeInstallPrompt(overrides: Partial<Event> = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, overrides)
  window.dispatchEvent(event)
  return event
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useInstallPrompt', () => {
  it('starts with no prompt available and not installed', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('offers to prompt once the browser fires beforeinstallprompt, and prevents its default mini-infobar', () => {
    const { result } = renderHook(() => useInstallPrompt())

    let prevented = false
    act(() => {
      dispatchBeforeInstallPrompt({ preventDefault: () => (prevented = true) })
    })

    expect(prevented).toBe(true)
    expect(result.current.canPromptInstall).toBe(true)
  })

  it('marks the app installed once accepted, and consumes the one-time prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const prompt = vi.fn().mockResolvedValue(undefined)
    const userChoice = Promise.resolve({ outcome: 'accepted' as const })

    act(() => {
      dispatchBeforeInstallPrompt({ preventDefault: () => {}, prompt, userChoice })
    })
    expect(result.current.canPromptInstall).toBe(true)

    await act(() => result.current.promptInstall())

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('does not mark the app installed when the prompt is dismissed', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const })

    act(() => {
      dispatchBeforeInstallPrompt({
        preventDefault: () => {},
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice,
      })
    })

    await act(() => result.current.promptInstall())

    expect(result.current.isInstalled).toBe(false)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('marks the app installed when the browser fires appinstalled directly', () => {
    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.isInstalled).toBe(true)
  })
})

describe('isIosSafari', () => {
  it('recognizes an iPhone/iPad user agent', () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    expect(isIosSafari()).toBe(true)
  })

  it('does not flag an ordinary desktop user agent', () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    })
    expect(isIosSafari()).toBe(false)
  })
})
