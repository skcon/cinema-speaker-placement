import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { PlaceableId } from '@/domain'
import {
  ConfigStoreContext,
  RoomAnalysisContext,
  SeatRecommendationContext,
  useComputedRoomAnalysis,
  useComputedSeatRecommendation,
} from './config-context'
import { createConfigStore } from './config-store'
import {
  SelectedItemContext,
  SelectionContext,
  useComputedSelectedItem,
  type Selection,
} from './selection-context'

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
  return (
    <ConfigStoreContext value={store}>
      <RoomAnalysisProvider>
        <SeatRecommendationProvider>
          <SelectionProvider>
            <SelectedItemProvider>{children}</SelectedItemProvider>
          </SelectionProvider>
        </SeatRecommendationProvider>
      </RoomAnalysisProvider>
    </ConfigStoreContext>
  )
}

/**
 * Works the Room analysis out once per config change for everything inside
 * it, so its cost does not grow with the number of sections, furniture
 * boxes or openings that read it. Its children are passed in, so only the
 * components that read the analysis re-render when it changes.
 */
function RoomAnalysisProvider({ children }: { children: ReactNode }) {
  const analysis = useComputedRoomAnalysis()
  return <RoomAnalysisContext value={analysis}>{children}</RoomAnalysisContext>
}

/**
 * Works the recommended seat out once for everything inside it. Its
 * children are passed in, so only the components that read the
 * recommendation re-render when it changes.
 */
function SeatRecommendationProvider({ children }: { children: ReactNode }) {
  const recommendation = useComputedSeatRecommendation()
  return (
    <SeatRecommendationContext value={recommendation}>
      {children}
    </SeatRecommendationContext>
  )
}

/**
 * Holds the Selected item for everything inside it: view state, kept out
 * of the config store, so it never reaches the share link or the undo
 * history.
 */
function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<PlaceableId | null>(null)
  const clear = useCallback(() => setSelected(null), [])
  const selection = useMemo<Selection>(
    () => ({ selected, select: setSelected, clear }),
    [selected, clear],
  )
  return <SelectionContext value={selection}>{children}</SelectionContext>
}

/**
 * Works the Selected item out once for everything inside it (the room view
 * and the details panel both read it).
 */
function SelectedItemProvider({ children }: { children: ReactNode }) {
  const item = useComputedSelectedItem()
  return <SelectedItemContext value={item}>{children}</SelectedItemContext>
}
