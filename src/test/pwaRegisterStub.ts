// Stands in for vite-plugin-pwa's virtual:pwa-register/react in tests (see
// the alias in vite.config.ts): the real module only exists inside a Vite
// build or dev server, and jsdom has no service worker to register anyway.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  }
}
