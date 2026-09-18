import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'

// jsdom doesn't implement the Pointer Events methods or scrollIntoView that
// Radix UI's interactive components (e.g. Select) rely on for pointer
// capture and keyboard navigation.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// A focused element left behind when a test ends becomes a detached node
// once React Testing Library unmounts it, and jsdom doesn't reset
// document.activeElement on its own; a later test's Radix UI component
// (e.g. Select) can then read that stale reference while deciding whether
// to open, and silently fail to. Blurring before unmount keeps every test
// starting from a clean focus state regardless of what the previous one did.
afterEach(() => {
  if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    document.activeElement.blur()
  }
})
