import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { trackImport, useImportInProgress } from './importActivity'

describe('trackImport / useImportInProgress', () => {
  it('reports an import in progress only while it runs', async () => {
    const { result } = renderHook(() => useImportInProgress())
    expect(result.current).toBe(false)

    let finish: () => void = () => {}
    let done: Promise<void> = Promise.resolve()
    act(() => {
      done = trackImport(() => new Promise<void>((resolve) => (finish = resolve)))
    })
    expect(result.current).toBe(true)

    await act(async () => {
      finish()
      await done
    })
    expect(result.current).toBe(false)
  })

  it('clears the flag even when the import fails', async () => {
    const { result } = renderHook(() => useImportInProgress())

    await act(async () => {
      await expect(trackImport(() => Promise.reject(new Error('bad file')))).rejects.toThrow(
        'bad file',
      )
    })

    await waitFor(() => expect(result.current).toBe(false))
  })
})
