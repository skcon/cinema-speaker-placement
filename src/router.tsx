import {
  createRootRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import { App } from '@/App'
import { validateSearch } from '@/search'

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
