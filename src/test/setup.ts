import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no scrolling; TanStack Router calls scrollTo on navigation.
window.scrollTo = () => {}

// jsdom has no layout or ResizeObserver; Recharts' responsive container
// observes its size (which stays 0 here, so no chart is drawn).
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
})
