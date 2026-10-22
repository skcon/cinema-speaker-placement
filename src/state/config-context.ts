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
  compareMlp,
  findRecommendedSeat,
  seatHeatmap,
  type Config,
  type RecommendedSeat,
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

/**
 * The Room analysis of the current config, shared by every component under
 * the config store (ConfigStoreProvider provides it), so the room is
 * analyzed once per change however many components read it. Tests can
 * provide an analysis of their own. Undefined outside the provider.
 */
export const RoomAnalysisContext = createContext<RoomAnalysis | undefined>(
  undefined,
)

/**
 * Everything the domain derives from the current config: one shared
 * analysis, worked out once per config change and followed live, so a drag
 * updates it every frame.
 */
export function useRoomAnalysis(): RoomAnalysis {
  const analysis = useContext(RoomAnalysisContext)
  if (analysis === undefined) {
    throw new Error('useRoomAnalysis must be used inside <ConfigStoreProvider>')
  }
  return analysis
}

/**
 * Works the Room analysis out, for RoomAnalysisContext only: once per
 * config change.
 */
export function useComputedRoomAnalysis(): RoomAnalysis {
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
 * deferred and kept through a gesture. The grid (findRecommendedSeat) is
 * memoized on everything it depends on (seatScoreKey), so moving the MLP
 * or a speaker, or a change of units or seat row size, keeps it; the
 * current MLP's cheap comparison with it (compareMlp) follows every
 * change (#120).
 */
export function useComputedSeatRecommendation(): SeatRecommendation | null {
  const config = useConfig((state) => state.gesture?.start ?? state.config)
  const deferred = useDeferredValue<Config | null>(config, null)
  const key = deferred && seatScoreKey(deferred)
  const [memo, setMemo] = useState<{
    key: string | null
    seat: RecommendedSeat | null
  }>({ key: null, seat: null })
  // Adjust state while rendering when the key changes (as CrossoverField
  // does), so the grid is scored once per key.
  let seat = memo.seat
  if (memo.key !== key) {
    seat = deferred && findRecommendedSeat(deferred)
    setMemo({ key, seat })
  }
  return useMemo(
    () =>
      deferred && seat ? { ...seat, ...compareMlp(deferred, seat) } : null,
    [deferred, seat],
  )
}
