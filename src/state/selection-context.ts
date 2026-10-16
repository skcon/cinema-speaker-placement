import { createContext, useContext, useMemo } from 'react'
import {
  itemDistances,
  MLP_ID,
  type ItemDistances,
  type PlaceableId,
  type PlacedOverhead,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type Placement,
  type PlacementGrading,
  type RoomPoint,
  type ScreenRelation,
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
  /** Its placement-range check, or null for the MLP. */
  readonly grading: PlacementGrading | null
  /**
   * How it relates to the Screen (L, C and R in a Room with one), else
   * null.
   */
  readonly screenRelation: ScreenRelation | null
}

/**
 * The Selected item, shared by every component under the config store
 * (ConfigStoreProvider provides it), so it is derived once per change.
 * Undefined outside the provider.
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
        grading: null,
        screenRelation: null,
      }
    }
    const item = gradedItem(selected, speakers, overheads, subwoofers)
    if (!item) return null
    return {
      id: selected,
      name: item.name,
      position: item.position,
      placement: item.placement,
      distances: itemDistances(room, item.position, mlp),
      grading: item.grading,
      screenRelation: item.screenRelation,
    }
  }, [selected, room, mlp, mlpPlacement, speakers, overheads, subwoofers])
}

/** A placed speaker, overhead or subwoofer by id, with its placement-range check. */
function gradedItem(
  id: PlaceableId,
  speakers: readonly PlacedSpeaker[],
  overheads: readonly PlacedOverhead[],
  subwoofers: readonly PlacedSubwoofer[],
) {
  const speaker = speakers.find(({ channel }) => channel === id)
  if (speaker) {
    const grading: PlacementGrading = {
      kind: 'speaker',
      check: speaker.placementRange,
    }
    return { ...speaker, grading }
  }
  const overhead = overheads.find(({ channel }) => channel === id)
  if (overhead) {
    const grading: PlacementGrading = {
      kind: 'overhead',
      check: overhead.placementRange,
    }
    return { ...overhead, grading, screenRelation: null }
  }
  const subwoofer = subwoofers.find((sub) => sub.id === id)
  if (subwoofer) {
    const grading: PlacementGrading = { kind: 'subwoofer' }
    return { ...subwoofer, grading, screenRelation: null }
  }
  return null
}
