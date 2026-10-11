import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { AppShell } from '@/ui/AppShell'

/** The root route's component: one config store around the page layout. */
export function App() {
  return (
    <ConfigStoreProvider>
      <AppShell />
    </ConfigStoreProvider>
  )
}
