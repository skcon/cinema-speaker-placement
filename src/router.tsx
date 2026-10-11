import {
  createRootRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import { App } from '@/App'

const rootRoute = createRootRoute({ component: App })

/**
 * The app has a single root route; the room config will live in its search
 * params. The basepath follows Vite's BASE_URL so the same build works at
 * `/` in dev and at `/cinema-speaker-placement/` on GitHub Pages.
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
