import {
  createRootRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import { AppShell } from '@/ui/AppShell'

const rootRoute = createRootRoute({ component: AppShell })

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
