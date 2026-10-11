import { useState, type ReactNode } from 'react'
import { ConfigStoreContext } from './config-context'
import { createConfigStore } from './config-store'

/**
 * Creates one config store for everything inside it, starting from the
 * share link's config param (or the default config without one), so the
 * first paint already shows the shared room. Later changes to the param
 * go through the store's `openShareLink`.
 */
export function ConfigStoreProvider({
  initialShareLink,
  children,
}: {
  initialShareLink?: string
  children: ReactNode
}) {
  const [store] = useState(() => {
    const store = createConfigStore()
    store.getState().openShareLink(initialShareLink)
    return store
  })
  return <ConfigStoreContext value={store}>{children}</ConfigStoreContext>
}
