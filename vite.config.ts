import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { PAGES_BASE_PATH } from './pages.config.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? PAGES_BASE_PATH : '/',
  plugins: [react(), tailwindcss()],
  build: {
    // The room view's chunk (Three.js + react-three-fiber, ~250 kB gzip) is
    // lazy-loaded and mostly Three.js itself, which can't be split further.
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    projects: [
      {
        extends: true,
        // Domain and state logic: the default 5 s per test. A heavy sweep
        // or speed check sets its own timeout, with a comment saying why.
        test: { name: 'logic', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['src/**/*.test.tsx'],
          // Each test renders the app (or a form wired to the store) and
          // types into it, which re-analyzes the room on every change:
          // about 1-4.5 s alone, and several times that with the CPU busy
          // (#93). The tests check behavior, not speed, so they get a
          // budget that holds on a loaded 4-core machine; the domain's
          // speed checks are what catch a slow analysis.
          testTimeout: 20_000,
        },
      },
    ],
  },
}))
