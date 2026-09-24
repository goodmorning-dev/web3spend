/** Back to the top of the page. Smooth when asked, unless the person has
 * turned on reduced motion in their system settings. */
export function scrollToTop({ smooth = false }: { smooth?: boolean } = {}): void {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  window.scrollTo({ top: 0, left: 0, behavior: smooth && !reduceMotion ? 'smooth' : 'instant' })
}
