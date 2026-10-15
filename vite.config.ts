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
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
}))
