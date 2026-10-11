import { useState, type ReactNode } from 'react'
import { ConfigStoreContext } from './config-context'
import { createConfigStore } from './config-store'

/**
 * Creates one config store for everything inside it, starting from the
 * encoded config in the share link (or the default config without one), so
 * the first paint already shows the shared room. Later changes to it go
 * through the store's `openEncodedConfig`.
 */
export function ConfigStoreProvider({
  initialEncodedConfig,
  children,
}: {
  initialEncodedConfig?: string
  children: ReactNode
}) {
  const [store] = useState(() => {
    const store = createConfigStore()
    store.getState().openEncodedConfig(initialEncodedConfig)
    return store
  })
  return <ConfigStoreContext value={store}>{children}</ConfigStoreContext>
}
