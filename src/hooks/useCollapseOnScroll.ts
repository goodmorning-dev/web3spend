import { useEffect, useState } from 'react'

/** How far the page has to move in one direction before the state flips,
 * so a finger resting on the screen doesn't make it flicker. */
const DIRECTION_THRESHOLD_PX = 8
/** Near the top of the page it always stays expanded. */
const TOP_ZONE_PX = 48

/** window.scrollY clamped to the real scroll range, so iOS's rubber-band
 * overscroll past either end doesn't register as a change of direction. */
function clampedScrollY(): number {
  const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
  return Math.min(Math.max(window.scrollY, 0), maxY)
}

/**
 * true after the page scrolls down, false again as soon as it scrolls back
 * up or nears the top: the phone tab bar's cue to shrink out of the way
 * while someone reads, and to come back the moment they look for it.
 * Starts expanded again whenever `resetKey` changes (the current route),
 * so a newly opened page always shows the full bar.
 */
export function useCollapseOnScroll(resetKey: string): boolean {
  const [state, setState] = useState({ key: resetKey, collapsed: false })

  useEffect(() => {
    let lastY = clampedScrollY()
    let frame = 0

    const update = () => {
      frame = 0
      const y = clampedScrollY()
      let collapsed: boolean
      if (y <= TOP_ZONE_PX) {
        collapsed = false
      } else if (y - lastY > DIRECTION_THRESHOLD_PX) {
        collapsed = true
      } else if (lastY - y > DIRECTION_THRESHOLD_PX) {
        collapsed = false
      } else {
        // not far enough yet: keep measuring from the same starting point
        return
      }
      lastY = y
      setState((previous) =>
        previous.key === resetKey && previous.collapsed === collapsed
          ? previous
          : { key: resetKey, collapsed },
      )
    }

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [resetKey])

  return state.key === resetKey && state.collapsed
}
