import {
  createRootRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import { App } from '@/App'

/** The app's search params. */
export type AppSearch = {
  /** The share link: the whole config, compressed (see encodeConfig). */
  config?: string
}

/**
 * Keeps a `config` param whatever it holds. The default search parser turns
 * text that looks like a number, boolean or JSON into that value; a share
 * link is always text, so anything else is passed on as text and fails to
 * decode, which shows the broken-link message.
 */
function validateSearch(search: Record<string, unknown>): AppSearch {
  const { config } = search
  if (config === undefined) return {}
  return {
    config: typeof config === 'string' ? config : JSON.stringify(config),
  }
}

const rootRoute = createRootRoute({ component: App, validateSearch })

/**
 * The app has a single root route; the room config lives in its `config`
 * search param. The basepath follows Vite's BASE_URL so the same build works
 * at `/` in dev and at `/cinema-speaker-placement/` on GitHub Pages.
 */
export function createAppRouter(options: { history?: RouterHistory } = {}) {
  return createRouter({
    routeTree: rootRoute,
    basepath: import.meta.env.BASE_URL,
    history: options.history,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
