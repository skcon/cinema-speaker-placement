import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { ConfigState, ConfigStore } from './config-store'

/** The app's config store; provided by ConfigStoreProvider. */
export const ConfigStoreContext = createContext<ConfigStore | null>(null)

/** Read from the config store; re-renders only when the selected value changes. */
export function useConfig<T>(selector: (state: ConfigState) => T): T {
  const store = useContext(ConfigStoreContext)
  if (!store) {
    throw new Error('useConfig must be used inside <ConfigStoreProvider>')
  }
  return useStore(store, selector)
}
