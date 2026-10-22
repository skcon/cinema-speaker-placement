/**
 * Manual positions: where the user put a speaker, a subwoofer or the MLP by
 * dragging it or editing it in the sidebar.
 *
 * ## Auto and manual
 *
 * Every listener-level and overhead channel, every subwoofer and the MLP is either
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
 * - an overhead speaker keeps SPEAKER_WALL_CLEARANCE from every wall and
 *   stays on the ceiling (its height is not edited, and follows the room
 *   height);
 * - a subwoofer keeps SUBWOOFER_WALL_CLEARANCE from every wall and stays at
 *   SUBWOOFER_HEIGHT (its height is not edited: it is a floor-standing box);
 * - the MLP keeps SPEAKER_WALL_CLEARANCE from every wall and stays at seated
 *   ear height (EAR_HEIGHT).
 *
 * When the Room shrinks past a manual item, the item moves in with the
 * wall; otherwise it stays where it was left. A drag stops at these
 * limits (clampToRoom); a length typed in the sidebar outside them is
 * rejected instead, and the field shows the range it accepts
 * (positionLengths).
 */
import {
  CHANNEL_IDS,
  DOLBY_LAYOUTS,
  OVERHEAD_CHANNEL_IDS,
} from './dolby-layouts'
import type { Layout } from './layout'
import { linkSlack } from './link-precision'
import { clamp, type AcceptedRange } from './range'
import {
  EAR_HEIGHT,
  SPEAKER_WALL_CLEARANCE,
  SUBWOOFER_HEIGHT,
  SUBWOOFER_WALL_CLEARANCE,
} from './reference'
import type { Room, RoomPoint, Wall } from './room'
import { SUBWOOFER_IDS, subwooferIds } from './subwoofer-arrangements'
import { distanceToWall, wallDistances } from './wall-frame'

/** The key the MLP's manual position is stored under. */
export const MLP_ID = 'MLP'

/**
 * Everything that can be placed by hand, by kind. Each kind has its own
 * rules (PLACEMENT_RULES) and its own ids; a new kind joins here, and
 * everything below follows.
 */
const PLACEABLES = {
  listenerLevel: CHANNEL_IDS,
  overhead: OVERHEAD_CHANNEL_IDS,
  subwoofer: SUBWOOFER_IDS,
  mlp: [MLP_ID],
} as const satisfies Record<string, readonly string[]>

/** A kind of placeable item, each with its own placement rules. */
export type PlaceableKind = keyof typeof PLACEABLES

/** Every placeable id: what the share link's schema accepts as a key. */
export const PLACEABLE_IDS = [
  ...PLACEABLES.listenerLevel,
  ...PLACEABLES.overhead,
  ...PLACEABLES.subwoofer,
  ...PLACEABLES.mlp,
] as const

// A new kind in PLACEABLES must be spread into PLACEABLE_IDS too.
true satisfies Exclude<
  PlaceableId,
  (typeof PLACEABLE_IDS)[number]
> extends never
  ? true
  : never

/** A listener-level or overhead channel, a subwoofer or the MLP. */
export type PlaceableId = (typeof PLACEABLES)[PlaceableKind][number]

/** Whether an item's position is derived (auto) or stored (manual). */
export type Placement = 'auto' | 'manual'

/** The stored positions of the manual items, in room coordinates (meters). */
export type ManualPositions = Partial<Record<PlaceableId, RoomPoint>>

/**
 * Where each kind of item may go (see above): how far it keeps from the
 * walls, and its height, either fixed (at a height, or on the ceiling) or
 * kept this far from the floor and the ceiling. All our modelling
 * assumptions (reference.ts).
 */
const PLACEMENT_RULES: Record<
  PlaceableKind,
  {
    wallClearance: number
    height:
      { fixed: number } | { fixed: 'ceiling' } | { surfaceClearance: number }
  }
> = {
  listenerLevel: {
    wallClearance: SPEAKER_WALL_CLEARANCE.meters,
    height: { surfaceClearance: SPEAKER_WALL_CLEARANCE.meters },
  },
  overhead: {
    wallClearance: SPEAKER_WALL_CLEARANCE.meters,
    height: { fixed: 'ceiling' },
  },
  subwoofer: {
    wallClearance: SUBWOOFER_WALL_CLEARANCE.meters,
    height: { fixed: SUBWOOFER_HEIGHT.meters },
  },
  mlp: {
    wallClearance: SPEAKER_WALL_CLEARANCE.meters,
    height: { fixed: EAR_HEIGHT.meters },
  },
}

/** Which kind of item `id` is. */
export function kindOf(id: PlaceableId): PlaceableKind {
  const kinds = Object.keys(PLACEABLES) as PlaceableKind[]
  const kind = kinds.find((k) =>
    (PLACEABLES[k] as readonly string[]).includes(id),
  )
  if (!kind) throw new Error(`Unknown placeable item ${id}`)
  return kind
}

/** Whether item `id` keeps a fixed height, so its height can't be edited. */
export function hasFixedHeight(id: PlaceableId): boolean {
  return 'fixed' in PLACEMENT_RULES[kindOf(id)].height
}

/** The items a layout has: its channels, its subwoofers and the MLP. */
export function placeablesIn(layout: Layout): readonly PlaceableId[] {
  const { channels, overheadChannels } = DOLBY_LAYOUTS[layout.dolbyLayout]
  return [
    ...channels.map(({ channel }) => channel),
    ...overheadChannels.map(({ channel }) => channel),
    ...subwooferIds(layout.subwoofers),
    MLP_ID,
  ]
}

/**
 * Where item `id` may be in `room` (see above), one range per room
 * coordinate; a fixed height is a range of one value.
 */
function coordinateLimits(
  room: Room,
  id: PlaceableId,
): Record<keyof RoomPoint, AcceptedRange> {
  const { wallClearance, height } = PLACEMENT_RULES[kindOf(id)]
  const xLimit = room.width / 2 - wallClearance
  return {
    x: { min: -xLimit, max: xLimit },
    y: { min: wallClearance, max: room.length - wallClearance },
    z: heightLimits(room, height),
  }
}

function heightLimits(
  room: Room,
  height: (typeof PLACEMENT_RULES)[PlaceableKind]['height'],
): AcceptedRange {
  if ('surfaceClearance' in height) {
    return {
      min: height.surfaceClearance,
      max: room.height - height.surfaceClearance,
    }
  }
  const z = height.fixed === 'ceiling' ? room.height : height.fixed
  return { min: z, max: z }
}

/** The point moved to the nearest place where item `id` may be (see above). */
export function clampToRoom(
  room: Room,
  id: PlaceableId,
  point: RoomPoint,
): RoomPoint {
  const limits = coordinateLimits(room, id)
  const held = (axis: keyof RoomPoint) =>
    clamp(point[axis], limits[axis].min, limits[axis].max)
  return { x: held('x'), y: held('y'), z: held('z') }
}

/**
 * One of an item's lengths a sidebar field edits: its height above the
 * floor, or its distance to a wall.
 */
export type PositionDimension = 'height' | Wall

/** One of an item's lengths as a field shows it. */
export type PositionLength = {
  /** How long it is now. */
  readonly meters: number
  /** The values the field accepts: where the item may be (see above). */
  readonly limits: AcceptedRange
}

/** An item's distance to one wall as a field shows it. */
export type WallPositionLength = PositionLength & { readonly wall: Wall }

/** The lengths of an item a sidebar field edits, as the fields show them. */
export type PositionLengths = {
  /** Its height above the floor; null when its height is fixed. */
  readonly height: PositionLength | null
  /**
   * Its distances to the nearer end wall (front or back), then the nearer
   * side wall (left or right), as wallDistances measures them.
   */
  readonly walls: readonly [
    along: WallPositionLength,
    across: WallPositionLength,
  ]
}

/**
 * The lengths of item `id` at `position` in `room` the sidebar edits: how
 * long each is now, and the values a field accepts, from the same rules
 * that keep a dragged item inside the Room (see above).
 */
export function positionLengths(
  room: Room,
  id: PlaceableId,
  position: RoomPoint,
): PositionLengths {
  const { along, across } = wallDistances(room, position)
  const atWall = (wall: Wall): WallPositionLength => ({
    ...wallDistanceLength(room, id, position, wall),
    wall,
  })
  return {
    height: positionLength(room, id, position, 'height'),
    walls: [atWall(along.wall), atWall(across.wall)],
  }
}

/**
 * One of item `id`'s lengths at `position` (see positionLengths); null for
 * the height of an item whose height is fixed.
 */
export function positionLength(
  room: Room,
  id: PlaceableId,
  position: RoomPoint,
  dimension: PositionDimension,
): PositionLength | null {
  if (dimension !== 'height')
    return wallDistanceLength(room, id, position, dimension)
  if (hasFixedHeight(id)) return null
  return { meters: position.z, limits: coordinateLimits(room, id).z }
}

/**
 * Item `id`'s distance to `wall` at `position`, and the distances it may
 * be at: its wall clearance from that wall and from the wall opposite.
 */
function wallDistanceLength(
  room: Room,
  id: PlaceableId,
  position: RoomPoint,
  wall: Wall,
): PositionLength {
  const { wallClearance } = PLACEMENT_RULES[kindOf(id)]
  const toOppositeWall =
    wall === 'front' || wall === 'back' ? room.length : room.width
  return {
    meters: distanceToWall(room, position, wall),
    limits: { min: wallClearance, max: toOppositeWall - wallClearance },
  }
}

/**
 * How far a stored coordinate may be from where the item may go: share
 * links store it to the millimeter, which can put an item on the clearance
 * line up to half a millimeter past it (see link-precision.ts).
 */
const ROUNDING_SLACK = linkSlack('manualPositions')

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
