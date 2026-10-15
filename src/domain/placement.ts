/**
 * Auto-place for listener-level speakers.
 *
 * ## The rule
 *
 * 1. **Angle**: each channel aims at the middle of its Dolby ideal azimuth
 *    range, to the nearest whole degree, on its own side of the room (L at
 *    -26°, Ls in a 5.1 bed at -115°, Lrs at -143° for 135°–150°). The middle
 *    leaves the most margin to both edges, and whole degrees match Dolby's
 *    resolution. Choosing the middle is our rule; Dolby gives only the
 *    range.
 * 2. **Front stage near the front wall**: Left, Center and Right go along
 *    their angle to where it meets a line FRONT_STAGE_WALL_DISTANCE (0.5 m,
 *    our choice after the manufacturers' advice) from the front wall
 *    (ADR 0005). Where a side wall's clearance comes first (a narrow room),
 *    or the MLP is itself nearer the front wall than that line, they stop
 *    at the walls' clearance instead.
 * 3. **Everything else at the walls**: surrounds and rear surrounds go
 *    along their angle to where it first meets a wall's clearance line
 *    (SPEAKER_WALL_CLEARANCE, 0.3 m, our modelling assumption, not
 *    Dolby's): the side wall, or the back wall if the angle reaches it
 *    first. The angle (which is graded) always holds; only the distance
 *    follows the room. The speakers are not equidistant from the MLP, and
 *    Dolby's answer to that is the receiver's distance (delay) setting
 *    (IG p.6, p.15; ADR 0005). Real-room practice puts surrounds at the
 *    walls, not on a circle around the seat
 *    (docs/research/real-room-placement.md section 3.1).
 * 4. **Height**: every listener-level speaker is at seated ear height
 *    (EAR_HEIGHT, IG p.6).
 * 5. **Aim**: every speaker faces the MLP, as Dolby asks: aim the speakers
 *    at the central seat and toe L/R in toward it (research section 5;
 *    WEB101).
 *
 * The MLP is always inside the clearance box (rooms are at least 2 m in
 * each direction), so every valid room fits every v1 layout inside its
 * ideal ranges, though in small rooms the speakers end up close to the MLP.
 * A manual MLP right against a wall can put a speaker on the MLP itself;
 * the analysis grades it like any other.
 */
import {
  azimuthFromSide,
  CHANNELS,
  type ChannelId,
  type ChannelReference,
} from './dolby-layouts'
import {
  EAR_HEIGHT,
  FRONT_STAGE_WALL_DISTANCE,
  SPEAKER_WALL_CLEARANCE,
} from './reference'
import {
  bearingTo,
  directionAtAzimuth,
  type Room,
  type RoomPoint,
} from './room'

/** Which way a speaker faces. */
export type Aim = {
  /**
   * The direction its front faces seen from above: degrees clockwise from
   * facing the front wall, in (-180°, +180°]. 180° faces the back wall.
   */
  readonly yaw: number
}

/** Where a listener-level channel goes around the MLP (see the rule above). */
export function autoPlaceSpeaker(
  room: Room,
  mlp: RoomPoint,
  { channel, azimuth: { ideal } }: ChannelReference,
): RoomPoint {
  // The middle of the ideal range in whole degrees, on the channel's side.
  const middle = Math.round((ideal.range.min + ideal.range.max) / 2)
  const azimuth = azimuthFromSide(CHANNELS[channel].side, middle)
  const frontLine = FRONT_STAGE_CHANNELS.has(channel)
    ? FRONT_STAGE_WALL_DISTANCE.meters
    : SPEAKER_WALL_CLEARANCE.meters
  const distance = distanceToWalls(room, mlp, azimuth, frontLine)
  const { dx, dy } = directionAtAzimuth(mlp, azimuth)
  return {
    x: mlp.x + distance * dx,
    y: mlp.y + distance * dy,
    z: EAR_HEIGHT.meters,
  }
}

/** The channels auto-place puts near the front wall (rule 2 above). */
const FRONT_STAGE_CHANNELS: ReadonlySet<ChannelId> = new Set(['L', 'C', 'R'])

/** Turn a speaker at `position` to face the MLP (rule 5 above). */
export function aimAtMlp(position: RoomPoint, mlp: RoomPoint): Aim {
  return { yaw: bearingTo(position, mlp) }
}

/**
 * How far the MLP can look along `azimuth` before it comes within the wall
 * clearance of a side or back wall, or within `frontLine` of the front
 * wall. A front line behind the MLP falls back to the wall clearance.
 */
function distanceToWalls(
  room: Room,
  mlp: RoomPoint,
  azimuth: number,
  frontLine: number,
): number {
  const { dx, dy } = directionAtAzimuth(mlp, azimuth)
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const front = mlp.y > frontLine ? frontLine : clearance
  const xLimit = room.width / 2 - clearance
  const limits = [
    distanceAlong(mlp.x, dx, -xLimit, xLimit),
    distanceAlong(mlp.y, dy, front, room.length - clearance),
  ]
  return Math.max(0, Math.min(...limits))
}

/** Distance along one axis from `start` moving at `step` per meter until leaving [low, high]. */
function distanceAlong(
  start: number,
  step: number,
  low: number,
  high: number,
): number {
  if (step > EPSILON) return (high - start) / step
  if (step < -EPSILON) return (low - start) / step
  return Number.POSITIVE_INFINITY
}

/** Direction components smaller than this count as zero (no wall ahead on that axis). */
const EPSILON = 1e-12
