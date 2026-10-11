import { ShareLinkProvider } from '@/ShareLinkProvider'
import { AppShell } from '@/ui/AppShell'

/**
 * The root route's component: the page layout around one config store that
 * stays in step with the share link in the address.
 */
export function App() {
  return (
    <ShareLinkProvider>
      <AppShell />
    </ShareLinkProvider>
  )
}
