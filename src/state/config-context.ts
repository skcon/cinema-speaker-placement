import {
  createContext,
  useContext,
  useDeferredValue,
  useMemo,
  useState,
} from 'react'
import { useStore } from 'zustand'
import {
  analyzeRoom,
  recommendSeat,
  seatHeatmap,
  type Config,
  type RoomAnalysis,
  type SeatHeatmap,
  type SeatRecommendation,
} from '@/domain'
import type { ConfigState, ConfigStore } from './config-store'
import { seatScoreKey } from './seat-recommendation'

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
 * The recommended seat, shared by every component under the config store
 * (ConfigStoreProvider provides it), so the grid is scored once per change
 * however many components read it. Undefined outside the provider.
 */
export const SeatRecommendationContext = createContext<
  SeatRecommendation | null | undefined
>(undefined)

/**
 * The recommended seat for the current config, worked out off the urgent
 * render (it scores a grid of seats): null until the first one is ready,
 * and the last one while the next is worked out. During a drag it stays
 * the one from before the drag, and is worked out again once the drag
 * ends, so dragging stays smooth. One shared memo (ADR 0004).
 */
export function useSeatRecommendation(): SeatRecommendation | null {
  const recommendation = useContext(SeatRecommendationContext)
  if (recommendation === undefined) {
    throw new Error(
      'useSeatRecommendation must be used inside <ConfigStoreProvider>',
    )
  }
  return recommendation
}

/**
 * The seat-score heatmap of the shared recommendation (useSeatRecommendation),
 * so its recommended seat is the shared one and no second grid is scored:
 * null while `enabled` is false or the recommendation is not worked out
 * yet, and kept until the recommendation changes.
 */
export function useSeatHeatmap(enabled: boolean): SeatHeatmap | null {
  const recommendation = useSeatRecommendation()
  return useMemo(
    () => (enabled && recommendation ? seatHeatmap(recommendation) : null),
    [enabled, recommendation],
  )
}

/**
 * Works the recommended seat out, for SeatRecommendationContext only:
 * deferred, kept through a gesture, and memoized on everything the score
 * depends on (seatScoreKey), so a change of units or seat row size
 * keeps it.
 */
export function useComputedSeatRecommendation(): SeatRecommendation | null {
  const config = useConfig((state) => state.gesture?.start ?? state.config)
  const deferred = useDeferredValue<Config | null>(config, null)
  const key = deferred && seatScoreKey(deferred)
  const [memo, setMemo] = useState<{
    key: string | null
    recommendation: SeatRecommendation | null
  }>({ key: null, recommendation: null })
  // Adjust state while rendering when the key changes (as CrossoverField
  // does), so the grid is scored once per key.
  if (memo.key !== key) {
    const next = {
      key,
      recommendation: deferred && recommendSeat(deferred),
    }
    setMemo(next)
    return next.recommendation
  }
  return memo.recommendation
}
