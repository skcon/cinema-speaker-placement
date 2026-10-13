/**
 * Manual positions: where the user put a speaker, a subwoofer or the MLP by
 * dragging it or editing it in the sidebar.
 *
 * ## Auto and manual
 *
 * Every listener-level channel, every subwoofer and the MLP is either
 * **auto** (its position is derived by auto-place from the Room, the Layout
 * and, for speakers, the MLP) or **manual** (its position is stored in the
 * config). Only manual positions are stored, keyed by channel, subwoofer id
 * or `MLP`; an item without an entry is auto. Auto-place clears them all.
 *
 * ## Where a manual item may go
 *
 * A manual item stays inside the Room by the same clearances auto-place
 * uses (all our modelling assumptions, see reference.ts):
 *
 * - a listener-level speaker keeps SPEAKER_WALL_CLEARANCE from every wall,
 *   and the same distance from the floor and the ceiling;
 * - a subwoofer keeps SUBWOOFER_WALL_CLEARANCE from every wall and stays at
 *   SUBWOOFER_HEIGHT (its height is not edited: it is a floor-standing box);
 * - the MLP keeps SPEAKER_WALL_CLEARANCE from every wall and stays at seated
 *   ear height (EAR_HEIGHT).
 *
 * When the Room shrinks past a manual item, the item moves in with the
 * wall; otherwise it stays where it was left.
 */
import { CHANNEL_IDS, DOLBY_LAYOUTS, type ChannelId } from './dolby-layouts'
import type { Layout } from './layout'
import {
  EAR_HEIGHT,
  SPEAKER_WALL_CLEARANCE,
  SUBWOOFER_HEIGHT,
  SUBWOOFER_WALL_CLEARANCE,
} from './reference'
import type { Room, RoomPoint } from './room'
import {
  SUBWOOFER_IDS,
  subwooferIds,
  type SubwooferId,
} from './subwoofer-arrangements'

/** The key the MLP's manual position is stored under. */
export const MLP_ID = 'MLP'

/** Everything that can be placed by hand: channels, subwoofers and the MLP. */
export const PLACEABLE_IDS = [...CHANNEL_IDS, ...SUBWOOFER_IDS, MLP_ID] as const

/** A listener-level channel, a subwoofer or the MLP. */
export type PlaceableId = ChannelId | SubwooferId | typeof MLP_ID

/** Whether an item's position is derived (auto) or stored (manual). */
export type Placement = 'auto' | 'manual'

/** The stored positions of the manual items, in room coordinates (meters). */
export type ManualPositions = Partial<Record<PlaceableId, RoomPoint>>

/** The items a layout has: its channels, its subwoofers and the MLP. */
export function placeablesIn(layout: Layout): readonly PlaceableId[] {
  return [
    ...DOLBY_LAYOUTS[layout.dolbyLayout].channels.map(({ channel }) => channel),
    ...subwooferIds(layout.subwoofers),
    MLP_ID,
  ]
}

function isSubwoofer(id: PlaceableId): id is SubwooferId {
  return SUBWOOFER_IDS.some((subwoofer) => subwoofer === id)
}

/** The point moved to the nearest place where item `id` may be (see above). */
export function clampToRoom(
  room: Room,
  id: PlaceableId,
  { x, y, z }: RoomPoint,
): RoomPoint {
  const clearance = isSubwoofer(id)
    ? SUBWOOFER_WALL_CLEARANCE.meters
    : SPEAKER_WALL_CLEARANCE.meters
  const xLimit = room.width / 2 - clearance
  return {
    x: clamp(x, -xLimit, xLimit),
    y: clamp(y, clearance, room.length - clearance),
    z: isSubwoofer(id)
      ? SUBWOOFER_HEIGHT.meters
      : id === MLP_ID
        ? EAR_HEIGHT.meters
        : clamp(z, clearance, room.height - clearance),
  }
}

/**
 * How far a stored coordinate may be from where the item may go: share
 * links round to the millimeter, which can put an item on the clearance
 * line up to half a millimeter past it.
 */
const ROUNDING_SLACK = 0.0005

/** Whether item `id` may be at `point` (see above), to the millimeter. */
export function mayBeAt(
  room: Room,
  id: PlaceableId,
  point: RoomPoint,
): boolean {
  const clamped = clampToRoom(room, id, point)
  return (['x', 'y', 'z'] as const).every(
    (axis) => Math.abs(clamped[axis] - point[axis]) <= ROUNDING_SLACK,
  )
}

/** Every manual position moved inside the Room (see above). */
export function keepInRoom(
  room: Room,
  positions: ManualPositions,
): ManualPositions {
  return mapPositions(positions, (id, point) => clampToRoom(room, id, point))
}

/** Only the manual positions of items the layout has. */
export function keepInLayout(
  layout: Layout,
  positions: ManualPositions,
): ManualPositions {
  const inLayout = placeablesIn(layout)
  return Object.fromEntries(
    entries(positions).filter(([id]) => inLayout.includes(id)),
  )
}

/** Share links store positions to the nearest millimeter, to stay short. */
const MILLIMETERS_PER_METER = 1000

/** Every coordinate rounded to the nearest millimeter. */
export function roundToMillimeter(positions: ManualPositions): ManualPositions {
  const round = (meters: number) =>
    // `+ 0` turns -0 into 0, so the JSON stays as short as it can be.
    Math.round(meters * MILLIMETERS_PER_METER) / MILLIMETERS_PER_METER + 0
  return mapPositions(positions, (_, { x, y, z }) => ({
    x: round(x),
    y: round(y),
    z: round(z),
  }))
}

/** The manual positions as [id, position] pairs, in PLACEABLE_IDS order. */
export function entries(
  positions: ManualPositions,
): [PlaceableId, RoomPoint][] {
  return PLACEABLE_IDS.flatMap((id) => {
    const point = positions[id]
    return point ? [[id, point] as [PlaceableId, RoomPoint]] : []
  })
}

function mapPositions(
  positions: ManualPositions,
  map: (id: PlaceableId, point: RoomPoint) => RoomPoint,
): ManualPositions {
  return Object.fromEntries(
    entries(positions).map(([id, point]) => [id, map(id, point)]),
  )
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}
