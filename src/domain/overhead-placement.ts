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
 *    (our modelling assumption, as for listener-level speakers).
 * 5. **Its own ranges win** (#150, ADR 0005 amendment): where rules 2–4
 *    leave the speaker outside its own azimuth or elevation range (the
 *    layout width says nothing about the overheads' azimuth, so a narrow
 *    room put the top front at 27°, outside 30°–60°), it moves to the
 *    nearest point on the ceiling, inside the wall clearance, where both
 *    angles are OVERHEAD_AIM.edgeMargin inside their ideal ranges:
 *    sideways only where that is enough, so the elevation stays as rule 3
 *    put it. Without room for the margin, the range edges are used. Where
 *    no point of the ceiling inside the clearance is ideal (the MLP too
 *    near a wall for the ceiling height), the overhead still can't grade
 *    better than outside (Dolby gives overheads no acceptable range); it
 *    then goes to the nearest point where its azimuth alone is ideal,
 *    else its elevation alone, else stays where rules 2–4 put it, and its
 *    angles are graded as they are. That is an ideal gap (ideal-gap.ts,
 *    #151): the sidebar names the angles that can't be ideal and the walls
 *    in the way.
 */
import { clamp, insetRange } from './range'
import {
  azimuthFromSide,
  OVERHEAD_CHANNELS,
  OVERHEAD_SPACING,
  overheadSideSign,
  type OverheadChannelReference,
} from './dolby-layouts'
import {
  clipToHalfPlanes,
  nearestPointIn,
  rectangle,
  xRangeAt,
  type ConvexPolygon,
  type HalfPlane,
} from './convex-region'
import type { IdealGap, IdealGapAngle } from './ideal-gap'
import { checkOverheadPlacementRange } from './placement-range'
import { OVERHEAD_AIM, SPEAKER_WALL_CLEARANCE } from './reference'
import {
  azimuthFromMlp,
  directionAtAzimuth,
  sideViewElevation,
  toRadians,
  WALLS,
  type FloorPoint,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'

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
  return placeOverhead(room, mlp, reference, width).position
}

/** An auto-placed overhead, and why its grade can't be ideal (null when it is). */
export type AutoPlacedOverhead = {
  readonly position: RoomPoint
  readonly idealGap: IdealGap | null
}

/**
 * Where an overhead channel goes, seen from the MLP (see the rule above),
 * and, where no point of the ceiling inside the wall clearance is ideal,
 * which angles can't be and which walls are in the way.
 */
export function placeOverhead(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
  width: number,
): AutoPlacedOverhead {
  const usual = usualPosition(room, mlp, reference, width)
  const onCeiling = (point: FloorPoint): RoomPoint => ({
    x: point.x,
    y: point.y,
    z: room.height,
  })
  if (isIdeal(mlp, reference, onCeiling(usual))) {
    return { position: onCeiling(usual), idealGap: null }
  }

  const position = onCeiling(nearestPreferred(room, mlp, reference, usual))
  return {
    position,
    // Graded as the analysis grades it, to the whole degree.
    idealGap: isIdeal(mlp, reference, position)
      ? null
      : overheadGap(room, mlp, reference),
  }
}

/** Rule 5: the nearest point of the first of preferredRegions that fits. */
function nearestPreferred(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
  usual: FloorPoint,
): FloorPoint {
  const clearance = clearanceRectangle(room)
  for (const planes of preferredRegions(room, mlp, reference)) {
    const region = clipToHalfPlanes(clearance, planes)
    const along = xRangeAt(region, usual.y)
    if (along) return { x: clamp(usual.x, along.min, along.max), y: usual.y }
    const nearest = nearestPointIn(region, usual)
    if (nearest) return nearest
  }
  return usual
}

/**
 * Rule 5's regions of the ceiling, best first: both angles ideal with the
 * margin, then without it; where neither fits inside the clearance, the
 * azimuth alone and then the elevation alone, so as few angles as
 * possible grade outside.
 */
function preferredRegions(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
): HalfPlane[][] {
  const { edgeMargin } = OVERHEAD_AIM
  const elevation = (margin: number) =>
    elevationHalfPlanes(room, mlp, reference, margin)
  const azimuth = (margin: number) => azimuthHalfPlanes(mlp, reference, margin)
  return [
    [...elevation(edgeMargin), ...azimuth(edgeMargin)],
    [...elevation(0), ...azimuth(0)],
    azimuth(edgeMargin),
    elevation(edgeMargin),
  ]
}

/** Rules 2–4: the spacing, the elevation target and the wall clearance. */
function usualPosition(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
  width: number,
): FloorPoint {
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
  }
}

/** Whether `position` grades ideal from the MLP, as the analysis grades it. */
function isIdeal(
  mlp: RoomPoint,
  reference: OverheadChannelReference,
  position: RoomPoint,
): boolean {
  return (
    checkOverheadPlacementRange(
      reference,
      azimuthFromMlp(mlp, position),
      sideViewElevation(mlp, position),
    ).grade === 'ideal'
  )
}

/** The ceiling inside the wall clearance, seen from above. */
function clearanceRectangle(room: Room): ConvexPolygon {
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const xLimit = room.width / 2 - clearance
  return rectangle(-xLimit, xLimit, clearance, room.length - clearance)
}

/**
 * The ceiling points whose elevation from the MLP is inside the channel's
 * ideal range, `margin` degrees in from each edge: two lines across the
 * room. Elevation e is seen (ceiling − ear height) / tan(e) ahead of the
 * MLP (rule 3), and grows toward the back wall. None when the ceiling is
 * not above the ears.
 */
function elevationHalfPlanes(
  room: Room,
  mlp: RoomPoint,
  { elevation }: OverheadChannelReference,
  margin: number,
): HalfPlane[] {
  const above = room.height - mlp.z
  if (above <= 0) return []
  const { min, max } = insetRange(elevation.ideal.range, margin)
  const aheadAt = (degrees: number) => above / Math.tan(toRadians(degrees))
  return [
    { through: { x: mlp.x, y: mlp.y - aheadAt(min) }, normal: { x: 0, y: 1 } },
    { through: { x: mlp.x, y: mlp.y - aheadAt(max) }, normal: { x: 0, y: -1 } },
  ]
}

/**
 * The ceiling points whose azimuth from the MLP is inside the channel's
 * ideal range, `margin` degrees in from each edge: a wedge from the MLP.
 * None where Dolby gives no azimuth range (top middle).
 */
function azimuthHalfPlanes(
  mlp: RoomPoint,
  { channel, azimuth }: OverheadChannelReference,
  margin: number,
): HalfPlane[] {
  if (azimuth.ideal === null) return []
  const side = OVERHEAD_CHANNELS[channel].side
  const { min, max } = insetRange(azimuth.ideal.range, margin)
  const toward = (angle: number): FloorPoint => {
    const { dx, dy } = directionAtAzimuth(mlp, azimuthFromSide(side, angle))
    return { x: dx, y: dy }
  }
  return wedge(mlp, toward(min), toward(max))
}

/**
 * The wedge between two rays from `apex` (unit directions less than 180°
 * apart), as two half-planes: each ray's side that faces the other.
 */
function wedge(apex: FloorPoint, a: FloorPoint, b: FloorPoint): HalfPlane[] {
  const facing = (from: FloorPoint, to: FloorPoint): FloorPoint => {
    const along = to.x * from.x + to.y * from.y
    return { x: to.x - along * from.x, y: to.y - along * from.y }
  }
  return [
    { through: apex, normal: facing(a, b) },
    { through: apex, normal: facing(b, a) },
  ]
}

/**
 * Why no point of the ceiling inside the wall clearance is ideal: the
 * angles that are ideal nowhere there, or both together when each is
 * ideal somewhere on its own, and the walls in the way.
 */
function overheadGap(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
): IdealGap {
  const clearance = clearanceRectangle(room)
  const azimuth = azimuthHalfPlanes(mlp, reference, 0)
  const elevation = elevationHalfPlanes(room, mlp, reference, 0)
  const fitsAlone = (planes: readonly HalfPlane[]) =>
    clipToHalfPlanes(clearance, planes).length > 0
  const azimuthRange = reference.azimuth.ideal?.range
  const graded: (IdealGapAngle & { readonly planes: HalfPlane[] })[] = [
    ...(azimuthRange
      ? [{ angle: 'azimuth' as const, ideal: azimuthRange, planes: azimuth }]
      : []),
    {
      angle: 'elevation',
      ideal: reference.elevation.ideal.range,
      planes: elevation,
    },
  ]
  const alone = graded.filter(({ planes }) => !fitsAlone(planes))
  const together = alone.length === 0
  return {
    channel: reference.channel,
    angles: (together ? graded : alone).map(({ angle, ideal }) => ({
      angle,
      ideal,
    })),
    together,
    walls: wallsInTheWay(room, [...azimuth, ...elevation]),
  }
}

/** Far enough past any room to stand for the whole plane (meters). */
const FAR = 1000

/**
 * The walls whose clearance keeps the region of `planes` out of the room:
 * each wall that, left out alone, would let some of it in; failing any,
 * each wall of a pair that would. In WALLS order.
 */
function wallsInTheWay(room: Room, planes: readonly HalfPlane[]): Wall[] {
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const xLimit = room.width / 2 - clearance
  const wallPlanes: Record<Wall, HalfPlane> = {
    front: { through: { x: 0, y: clearance }, normal: { x: 0, y: 1 } },
    right: { through: { x: xLimit, y: 0 }, normal: { x: -1, y: 0 } },
    back: {
      through: { x: 0, y: room.length - clearance },
      normal: { x: 0, y: -1 },
    },
    left: { through: { x: -xLimit, y: 0 }, normal: { x: 1, y: 0 } },
  }
  const opensWithout = (open: readonly Wall[]) =>
    clipToHalfPlanes(rectangle(-FAR, FAR, -FAR, FAR), [
      ...planes,
      ...WALLS.filter((wall) => !open.includes(wall)).map(
        (wall) => wallPlanes[wall],
      ),
    ]).length > 0
  const alone = WALLS.filter((wall) => opensWithout([wall]))
  if (alone.length > 0) return alone
  const paired = WALLS.flatMap((first, index) =>
    WALLS.slice(index + 1)
      .filter((second) => opensWithout([first, second]))
      .flatMap((second) => [first, second]),
  )
  return WALLS.filter((wall) => paired.includes(wall))
}
