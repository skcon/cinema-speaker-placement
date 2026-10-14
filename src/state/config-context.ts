import { createContext, useContext, useDeferredValue, useMemo } from 'react'
import { useStore } from 'zustand'
import {
  analyzeRoom,
  recommendSeat,
  type Config,
  type RoomAnalysis,
  type SeatRecommendation,
} from '@/domain'
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

/**
 * The recommended seat for the current config, worked out off the urgent
 * render (it scores a grid of seats): null until the first one is ready,
 * and the last one while the next is worked out. During a drag it stays
 * the one from before the drag, and is worked out again once the drag
 * ends, so dragging stays smooth.
 */
export function useSeatRecommendation(): SeatRecommendation | null {
  const config = useConfig((state) => state.gesture?.start ?? state.config)
  const deferred = useDeferredValue<Config | null>(config, null)
  return useMemo(() => (deferred ? recommendSeat(deferred) : null), [deferred])
}
