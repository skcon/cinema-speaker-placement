import { useState, type ReactNode } from 'react'
import type { Config } from '@/domain'
import { ConfigStoreContext } from './config-context'
import { createConfigStore } from './config-store'

/** Creates one config store for everything inside it. */
export function ConfigStoreProvider({
  initialConfig,
  children,
}: {
  initialConfig?: Config
  children: ReactNode
}) {
  const [store] = useState(() => createConfigStore(initialConfig))
  return <ConfigStoreContext value={store}>{children}</ConfigStoreContext>
}
