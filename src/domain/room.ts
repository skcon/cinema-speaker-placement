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
 * **Azimuth** (Dolby's horizontal angle, docs/research/dolby-speaker-placement.md
 * section "Conventions") is measured at the MLP: 0° points from the MLP
 * straight at the front wall (the -y direction, Dolby's "center-front
 * reference"). It grows clockwise seen from above, so +90° is the listener's
 * right (+x) and ±180° is straight behind. For a point P seen from the MLP M:
 * `azimuth = atan2(P.x - M.x, M.y - P.y)`.
 */

/** A point in room coordinates (see above), in meters. */
export type RoomPoint = { x: number; y: number; z: number }

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

/** First-visit room from the v1 spec (issue #2, user story 6). */
export const DEFAULT_ROOM: Room = { length: 6, width: 4.5, height: 2.6 }

/**
 * Accepted room sizes, inclusive, in meters. These are product limits from
 * the v1 spec (issue #2, user story 5) that catch typos; Dolby gives no room
 * size limits (docs/research/dolby-speaker-placement.md section 6).
 */
export const ROOM_DIMENSION_LIMITS = {
  length: { min: 2, max: 15 },
  width: { min: 2, max: 15 },
  height: { min: 2, max: 5 },
} as const satisfies Record<RoomDimension, { min: number; max: number }>

/** Why a room dimension was rejected, with the accepted range. */
export type RoomDimensionProblem = {
  problem: 'not-a-number' | 'too-small' | 'too-large'
  min: number
  max: number
}

/** `null` when the value is an accepted size for that dimension. */
export function checkRoomDimension(
  dimension: RoomDimension,
  meters: number,
): RoomDimensionProblem | null {
  const { min, max } = ROOM_DIMENSION_LIMITS[dimension]
  if (!Number.isFinite(meters)) return { problem: 'not-a-number', min, max }
  if (meters < min) return { problem: 'too-small', min, max }
  if (meters > max) return { problem: 'too-large', min, max }
  return null
}

export function isValidRoom(room: Room): boolean {
  return (Object.keys(ROOM_DIMENSION_LIMITS) as RoomDimension[]).every(
    (dimension) => checkRoomDimension(dimension, room[dimension]) === null,
  )
}
