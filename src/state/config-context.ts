import { createContext, useContext, useMemo } from 'react'
import { useStore } from 'zustand'
import { analyzeRoom, type RoomAnalysis } from '@/domain'
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

/** Everything the domain derives from the current config, recomputed only when it changes. */
export function useRoomAnalysis(): RoomAnalysis {
  const config = useConfig((state) => state.config)
  return useMemo(() => analyzeRoom(config), [config])
}
