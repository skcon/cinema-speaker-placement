/**
 * Auto-place for overhead speakers.
 *
 * ## The rule
 *
 * Dolby gives elevation ranges, azimuth ranges and a lateral spacing for
 * overheads (dolby-layouts.ts), not positions; turning them into positions
 * is our rule:
 *
 * 1. **Height**: on the ceiling, at the room height: an overhead speaker is
 *    mounted in or on the ceiling (GLOSSARY.md). Its height is not edited;
 *    it follows the ceiling when the room height changes.
 * 2. **Lateral**: each pair sits OVERHEAD_SPACING's middle, 0.6 × the
 *    layout width, apart (0.5–0.7 in IG p.7, IG p.8 fig.3), centered on the
 *    MLP. The layout width is our interpretation: the lateral distance
 *    between the outermost listener-level speakers as placed.
 * 3. **Front to back**: at the channel's elevation target seen from the
 *    MLP, in Dolby's side-view convention: the nominal where Dolby states
 *    one (top front 45°, top rear 135°), else the middle of the ideal range
 *    to the nearest whole degree (top middle: 83° for 65°–100°). That puts
 *    it (ceiling − ear height) / tan(elevation) ahead of the MLP.
 * 4. **Walls**: the speaker keeps SPEAKER_WALL_CLEARANCE from every wall
 *    (our modelling assumption, as for listener-level speakers). Where
 *    that moves it, its elevation and azimuth change, and are graded as
 *    they are.
 */
import {
  OVERHEAD_SPACING,
  overheadSideSign,
  type OverheadChannelReference,
} from './dolby-layouts'
import { clamp } from './range'
import { SPEAKER_WALL_CLEARANCE } from './reference'
import { toRadians, type Room, type RoomPoint } from './room'

/**
 * The layout width (rule 2): the lateral distance between the outermost
 * listener-level speakers.
 */
export function layoutWidth(speakers: readonly RoomPoint[]): number {
  if (speakers.length === 0) return 0
  const xs = speakers.map(({ x }) => x)
  return Math.max(...xs) - Math.min(...xs)
}

/** The elevation an overhead channel aims for (rule 3), in Dolby's side-view convention. */
export function elevationTarget({
  elevation: { nominal, ideal },
}: OverheadChannelReference): number {
  return nominal ?? Math.round((ideal.range.min + ideal.range.max) / 2)
}

/** Where an overhead channel goes, seen from the MLP (see the rule above). */
export function autoPlaceOverhead(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
  width: number,
): RoomPoint {
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const { min, max } = OVERHEAD_SPACING.range
  const half = (((min + max) / 2) * width) / 2
  const side = overheadSideSign(reference.channel)
  const radians = toRadians(elevationTarget(reference))
  const ahead = ((room.height - mlp.z) * Math.cos(radians)) / Math.sin(radians)
  const xLimit = room.width / 2 - clearance
  return {
    x: clamp(mlp.x + side * half, -xLimit, xLimit),
    y: clamp(mlp.y - ahead, clearance, room.length - clearance),
    z: room.height,
  }
}
