import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no scrolling; TanStack Router calls scrollTo on navigation.
window.scrollTo = () => {}

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
})
