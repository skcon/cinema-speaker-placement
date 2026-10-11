/**
 * Auto-place for listener-level speakers.
 *
 * ## The rule
 *
 * 1. **Angle**: each channel aims at the middle of its Dolby ideal azimuth
 *    range, on its own side of the room (L at -26°, Ls in a 5.1 bed at
 *    -115°). The middle leaves the most margin to both edges. Choosing the
 *    middle is our rule; Dolby gives only the range.
 * 2. **Reference distance**: Dolby wants every listener-level speaker the
 *    same distance from the MLP, with the front speakers setting that
 *    distance (IG p.6). Here the front wall sets it: the reference distance
 *    is how far the MLP is from the front wall's clearance line along the
 *    center-front reference, which is where the Center goes, at the screen.
 * 3. **Walls**: a speaker goes at the reference distance along its angle,
 *    or nearer along the same angle where that would come closer to a wall
 *    than the wall clearance. The angle (which is graded) always holds;
 *    only the distance gives way, and Dolby's answer to unequal distances is
 *    delay compensation (IG p.6, p.15).
 * 4. **Height**: every listener-level speaker is at seated ear height
 *    (EAR_HEIGHT, IG p.6).
 *
 * The MLP is always inside the clearance box (rooms are at least 2 m in
 * each direction), so every valid room fits every v1 layout inside its
 * ideal ranges, though in small rooms the speakers end up close to the MLP.
 */
import {
  CHANNELS,
  type AngleRange,
  type ChannelId,
  type ChannelReference,
} from './dolby-layouts'
import { EAR_HEIGHT } from './reference'
import { directionAtAzimuth, type Room, type RoomPoint } from './room'

/**
 * How close a listener-level speaker's position (its acoustic center) may
 * come to any wall, in meters: room for the cabinet behind it.
 *
 * Our modelling assumption, not Dolby's: Dolby gives no distance from the
 * walls (docs/research/dolby-speaker-placement.md section 7).
 */
export const SPEAKER_WALL_CLEARANCE = 0.3

/** An auto-placed listener-level speaker. */
export type AutoPlacement = {
  readonly channel: ChannelId
  readonly position: RoomPoint
}

/** Place a layout's listener-level channels around the MLP (see the rule above). */
export function autoPlaceListenerLevel(
  room: Room,
  mlp: RoomPoint,
  channels: readonly ChannelReference[],
): AutoPlacement[] {
  const referenceDistance = distanceToClearance(room, mlp, 0)
  return channels.map(({ channel, ideal }) => {
    const azimuth = targetAzimuth(channel, ideal.range)
    const distance = Math.min(
      referenceDistance,
      distanceToClearance(room, mlp, azimuth),
    )
    const { dx, dy } = directionAtAzimuth(mlp, azimuth)
    return {
      channel,
      position: {
        x: mlp.x + distance * dx,
        y: mlp.y + distance * dy,
        z: EAR_HEIGHT.meters,
      },
    }
  })
}

/** The middle of the ideal range, negative for a left-side channel. */
function targetAzimuth(channel: ChannelId, { min, max }: AngleRange): number {
  const middle = (min + max) / 2
  return CHANNELS[channel].side === 'left' ? -middle : middle
}

/**
 * How far the MLP can look along `azimuth` before it comes within the wall
 * clearance of a wall.
 */
function distanceToClearance(
  room: Room,
  mlp: RoomPoint,
  azimuth: number,
): number {
  const { dx, dy } = directionAtAzimuth(mlp, azimuth)
  const xLimit = room.width / 2 - SPEAKER_WALL_CLEARANCE
  const limits = [
    distanceAlong(mlp.x, dx, -xLimit, xLimit),
    distanceAlong(
      mlp.y,
      dy,
      SPEAKER_WALL_CLEARANCE,
      room.length - SPEAKER_WALL_CLEARANCE,
    ),
  ]
  return Math.min(...limits)
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
