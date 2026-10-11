import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site from https://<owner>.github.io/cinema-speaker-placement/
const PAGES_BASE = '/cinema-speaker-placement/'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? PAGES_BASE : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}))
