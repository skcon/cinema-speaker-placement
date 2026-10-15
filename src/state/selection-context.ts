import { createContext, useContext, useMemo } from 'react'
import {
  itemDistances,
  MLP_ID,
  type ItemDistances,
  type PlaceableId,
  type Placement,
  type RoomPoint,
} from '@/domain'
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

/** The Selected item as the details panel and the room view show it. */
export type SelectedItem = {
  readonly id: PlaceableId
  /** Its name, for example "Left", "Subwoofer 1" or "MLP". */
  readonly name: string
  /** Where it is, in room coordinates. */
  readonly position: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** To its two nearest walls and (unless it is the MLP) the MLP. */
  readonly distances: ItemDistances
}

/**
 * The selected item, placed in the current room with its distances, or
 * null when nothing is selected or the selected item has left the layout.
 * It follows the config live, so a drag updates it every frame.
 */
export function useSelectedItem(): SelectedItem | null {
  const { selected } = useSelection()
  const room = useConfig((state) => state.config.room)
  const { mlp, mlpPlacement, speakers, overheads, subwoofers } =
    useRoomAnalysis()
  return useMemo(() => {
    if (!selected) return null
    if (selected === MLP_ID) {
      return {
        id: MLP_ID,
        name: 'MLP',
        position: mlp,
        placement: mlpPlacement,
        distances: itemDistances(room, mlp, null),
      }
    }
    const item =
      [...speakers, ...overheads].find(({ channel }) => channel === selected) ??
      subwoofers.find(({ id }) => id === selected)
    if (!item) return null
    return {
      id: selected,
      name: item.name,
      position: item.position,
      placement: item.placement,
      distances: itemDistances(room, item.position, mlp),
    }
  }, [selected, room, mlp, mlpPlacement, speakers, overheads, subwoofers])
}
