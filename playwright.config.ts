import { defineConfig, devices } from '@playwright/test'
import { PAGES_BASE_PATH } from './pages.config.ts'

const PORT = 4173
// E2E runs against the production build under the GitHub Pages base path,
// so it also catches asset and router basepath mistakes.
const BASE_URL = `http://localhost:${PORT}${PAGES_BASE_PATH}`
const CI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !CI,
  },
})
