import { createContext, useContext, useMemo } from 'react'
import { selectedItem, type PlaceableId, type SelectedItem } from '@/domain'
import { useConfig, useRoomAnalysis } from './config-context'

/**
 * The Selected item in the room view: view state only, never in the
 * config, the share link or the undo history.
 */
export type Selection = {
  /** The selected speaker, subwoofer or MLP, or null. */
  readonly selected: PlaceableId | null
  readonly select: (id: PlaceableId) => void
  readonly clear: () => void
}

/** The selection; provided by ConfigStoreProvider (SelectionProvider). */
export const SelectionContext = createContext<Selection | null>(null)

/** The selection, to read or change. */
export function useSelection(): Selection {
  const selection = useContext(SelectionContext)
  if (!selection) {
    throw new Error('useSelection must be used inside <ConfigStoreProvider>')
  }
  return selection
}

/**
 * The Selected item (selectedItem in the domain), shared by every
 * component under the config store (ConfigStoreProvider provides it), so
 * it is derived once per change. Undefined outside the provider.
 */
export const SelectedItemContext = createContext<
  SelectedItem | null | undefined
>(undefined)

/**
 * The selected item, placed in the current room with its distances, or
 * null when nothing is selected or the selected item has left the layout.
 * It follows the config live, so a drag updates it every frame.
 */
export function useSelectedItem(): SelectedItem | null {
  const item = useContext(SelectedItemContext)
  if (item === undefined) {
    throw new Error('useSelectedItem must be used inside <ConfigStoreProvider>')
  }
  return item
}

/**
 * Works the Selected item out, for SelectedItemContext only: from the
 * selection and the shared Room analysis.
 */
export function useComputedSelectedItem(): SelectedItem | null {
  const { selected } = useSelection()
  const room = useConfig((state) => state.config.room)
  const analysis = useRoomAnalysis()
  return useMemo(
    () => selectedItem(room, analysis, selected),
    [room, analysis, selected],
  )
}
