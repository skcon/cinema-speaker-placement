/**
 * The Room and its coordinate system.
 *
 * ## Room coordinates
 *
 * Every point in the room (speakers, the MLP, later the seat row) uses one
 * coordinate system, in meters:
 *
 * - **Origin**: on the floor, at the middle of the front wall. The front wall
 *   is the wall the MLP faces, where the screen and the Center channel go.
 * - **x**: across the room, positive to the right as seen from the MLP facing
 *   the front wall. Runs from `-width / 2` (left wall) to `+width / 2` (right
 *   wall), so a left/right channel pair mirrors as `x` and `-x`.
 * - **y**: from the front wall (`y = 0`) toward the back wall (`y = length`).
 *   Room length is always measured front to back.
 * - **z**: height above the floor (`z = 0`), up to the ceiling (`z = height`).
 *
 * In a floor plan drawn with the front wall at the top, x grows to the right
 * and y grows downward, like screen coordinates. With z up the basis is
 * left-handed, so the scene layer swaps axes when it maps to Three.js.
 *
 * ## Angles seen from the MLP
 *
 * Both follow docs/research/dolby-speaker-placement.md, section "Conventions
 * used in this file". M is the MLP (its z is ear height), P the point seen.
 *
 * **Azimuth** is the horizontal angle from Dolby's "center-front reference":
 * the line from the MLP to the middle of the front wall, F = (0, 0), where the
 * screen and the Center channel are. It grows clockwise seen from above (toward
 * the listener's right) and runs from -180° to +180°, where ±180° is straight
 * behind along that line. With `bearing(dx, dy) = atan2(dx, -dy)`, the angle
 * of a direction clockwise from -y:
 *
 *     azimuth = wrap(bearing(P.x - M.x, P.y - M.y) - bearing(F.x - M.x, F.y - M.y))
 *
 * where `wrap` brings the difference into (-180°, +180°]. The reference is not
 * the -y direction: for an MLP off the center line at (0.5, 2.28), the Center
 * is at 0° and straight toward the front wall is +12.4°. Only on the center
 * line (M.x = 0) does the formula reduce to `atan2(P.x - M.x, M.y - P.y)`.
 *
 * **Elevation** is the angle above the horizontal plane at ear height,
 * measured in the vertical plane through M and P: 0° at ear level, +90°
 * straight up, -90° straight down.
 *
 *     elevation = atan2(P.z - M.z, hypot(P.x - M.x, P.y - M.y))
 *
 * Dolby's side views use one angle that sweeps over the listener: 0° straight
 * ahead at ear level, 90° straight overhead, 180° straight behind. A Dolby
 * value d of 90° or less is elevation d in front of the listener
 * (|azimuth| ≤ 90°); above 90° it is elevation 180° - d behind them
 * (|azimuth| > 90°). For example, top rear at 135° is 45° elevation, behind.
 * `sideViewElevation` measures overheads this way, in the side view only
 * (the y–z plane), as Dolby draws them.
 */

import { checkRange, type AcceptedRange, type RangeProblem } from './range'

/** A point in room coordinates (see above), in meters. */
export type RoomPoint = { x: number; y: number; z: number }

/** A point on the floor plan: room coordinates without the height. */
export type FloorPoint = { x: number; y: number }

/** A rectangular Room's inside dimensions, in meters. */
export type Room = {
  /** Front wall to back wall (along y). */
  length: number
  /** Left wall to right wall (along x). */
  width: number
  /** Floor to ceiling (along z). */
  height: number
}

export type RoomDimension = keyof Room

/**
 * A wall of the Room, named as seen from the MLP facing the front wall.
 * Where things are relative to a wall (along it, out from it) is
 * wall-frame.ts.
 */
export type Wall = 'front' | 'right' | 'back' | 'left'

/** A straight line between two room points. */
export type RoomSegment = [from: RoomPoint, to: RoomPoint]

/** The middle of the floor: on the center line, halfway back. */
export function floorCenter({ length }: Room): RoomPoint {
  return { x: 0, y: length / 2, z: 0 }
}

/**
 * The floor's corners, clockwise seen from above: front left, front right,
 * back right, back left.
 */
export function floorCorners({
  length,
  width,
}: Room): [RoomPoint, RoomPoint, RoomPoint, RoomPoint] {
  const half = width / 2
  return [
    { x: -half, y: 0, z: 0 },
    { x: half, y: 0, z: 0 },
    { x: half, y: length, z: 0 },
    { x: -half, y: length, z: 0 },
  ]
}

/**
 * Where each wall meets the floor, from corner to corner, going clockwise
 * seen from above (so the front wall runs from left to right).
 */
export function wallBases(room: Room): Record<Wall, RoomSegment> {
  const [frontLeft, frontRight, backRight, backLeft] = floorCorners(room)
  return {
    front: [frontLeft, frontRight],
    right: [frontRight, backRight],
    back: [backRight, backLeft],
    left: [backLeft, frontLeft],
  }
}

/** The walls, clockwise seen from above, starting at the front wall. */
export const WALLS = [
  'front',
  'right',
  'back',
  'left',
] as const satisfies readonly Wall[]

/** The straight-line distance between two room points, in meters. */
export function distanceBetween(a: RoomPoint, b: RoomPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

const DEGREES_PER_RADIAN = 180 / Math.PI

/** An angle in degrees, in radians. */
export function toRadians(degrees: number): number {
  return degrees / DEGREES_PER_RADIAN
}

/**
 * The bearing of a horizontal direction, in degrees clockwise from -y
 * (straight at the front wall), seen from above.
 */
function bearing(dx: number, dy: number): number {
  return Math.atan2(dx, -dy) * DEGREES_PER_RADIAN
}

/** An angle in degrees brought into (-180°, +180°]. */
function wrapDegrees(angle: number): number {
  const turn = angle % 360
  if (turn > 180) return turn - 360
  if (turn <= -180) return turn + 360
  return turn
}

/**
 * The horizontal direction from one point to another, seen from above: in
 * degrees clockwise from facing the front wall, in (-180°, +180°].
 */
export function bearingTo(from: RoomPoint, to: RoomPoint): number {
  return wrapDegrees(bearing(to.x - from.x, to.y - from.y))
}

/** The bearing of the center-front reference: from the MLP to the middle of the front wall. */
function centerFrontBearing(mlp: RoomPoint): number {
  return bearing(-mlp.x, -mlp.y)
}

/** The azimuth of `point` seen from the MLP, in degrees (see "Angles seen from the MLP" above). */
export function azimuthFromMlp(mlp: RoomPoint, point: RoomPoint): number {
  return wrapDegrees(
    bearing(point.x - mlp.x, point.y - mlp.y) - centerFrontBearing(mlp),
  )
}

/**
 * The elevation of `point` seen from the MLP in Dolby's side-view
 * convention (see "Angles seen from the MLP" above): the angle in the side
 * view, the vertical plane through the MLP along the room length, from
 * straight ahead at ear level (0°) over the listener (90°) to straight
 * behind (180°). Below ear height it is negative.
 */
export function sideViewElevation(mlp: RoomPoint, point: RoomPoint): number {
  // Ahead is toward the front wall, -y.
  return Math.atan2(point.z - mlp.z, mlp.y - point.y) * DEGREES_PER_RADIAN
}

/**
 * The horizontal unit direction (dx, dy) at `azimuth` degrees seen from the
 * MLP: the inverse of `azimuthFromMlp`.
 */
export function directionAtAzimuth(
  mlp: RoomPoint,
  azimuth: number,
): { dx: number; dy: number } {
  const radians = toRadians(centerFrontBearing(mlp) + azimuth)
  return { dx: Math.sin(radians), dy: -Math.cos(radians) }
}

/** First-visit room from the v1 spec (issue #2, user story 6). */
export const DEFAULT_ROOM: Room = { length: 6, width: 4.5, height: 2.6 }

/**
 * Accepted room sizes, inclusive, in meters. These are product limits from
 * the v1 spec (issue #2, user story 5) that catch typos; Dolby gives no room
 * size limits (docs/research/dolby-speaker-placement.md section 6).
 */
const ROOM_DIMENSION_LIMITS = {
  length: { min: 2, max: 15 },
  width: { min: 2, max: 15 },
  height: { min: 2, max: 5 },
} as const satisfies Record<RoomDimension, AcceptedRange>

/** Why a room dimension was rejected, with the accepted range. */
export type RoomDimensionProblem = RangeProblem

/** `null` when the value is an accepted size for that dimension. */
export function checkRoomDimension(
  dimension: RoomDimension,
  meters: number,
): RoomDimensionProblem | null {
  return checkRange(meters, ROOM_DIMENSION_LIMITS[dimension])
}
