/**
 * Auto-place for listener-level speakers.
 *
 * ## The rule
 *
 * 1. **Angle**: each channel aims at the middle of its Dolby ideal azimuth
 *    range, to the nearest whole degree, on its own side of the room (Ls in
 *    a 5.1 bed at -115°, Lrs at -143° for 135°–150°). The middle leaves the
 *    most margin to both edges, and whole degrees match Dolby's resolution.
 *    Choosing the middle is our rule; Dolby gives only the range. Left and
 *    Right are the exception (#121, ADR 0005 amendment): they aim at
 *    Dolby's 30° L/R reference less a 1° margin to the ideal range's edge
 *    (LEFT_RIGHT_AIM: L at -29°), so they form a near-equilateral triangle
 *    with the MLP instead of a narrow stage.
 * 2. **Front stage near the front wall**: Left, Center and Right go along
 *    their angle to where it meets a line parallel to the front wall, the
 *    same for all three (ADR 0005). Without a Screen its distance from the
 *    wall is chosen for the seat they are installed for, between the wall
 *    clearance and 0.6 m, where their reflection off the front wall leaves
 *    the response nearest the target (#158, front-wall-distance.ts;
 *    FRONT_STAGE_WALL_DISTANCE, 0.5 m, when the seat is too near the wall
 *    for that). Where a side wall's clearance comes first (a narrow room),
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
 * 6. **The Screen** (#58, ADR 0005 amendment), when the Room has one,
 *    moves L, C and R within their Dolby ranges (see "With a screen" at
 *    autoPlaceSpeakerAtScreen). Without one, rules 1-4 hold as they are.
 * 7. **Every grade ideal where the room allows** (#151, ADR 0005
 *    amendment): a speaker placed along an ideal azimuth grades ideal, so
 *    rules 1-6 already give every speaker an ideal grade wherever its aim
 *    leaves the MLP at all. Only an MLP on a wall's clearance line (a
 *    manual one) can leave a speaker aimed into that wall with nowhere to
 *    go. Then it turns to the nearest whole-degree azimuth of its ideal
 *    range that leaves it LISTENER_LEVEL_AIM.minimumDistance from the MLP,
 *    1° inside the range's edges first (LISTENER_LEVEL_AIM), and stops at
 *    the same walls and front-stage line. Where no ideal azimuth does, it
 *    is an ideal gap (ideal-gap.ts): the speaker goes to the nearest
 *    acceptable azimuth that does, else the nearest of any, is graded as
 *    it is, and the sidebar says which walls are in the way.
 *
 * The MLP is always inside the clearance box (rooms are at least 2 m in
 * each direction), so the auto MLP and every seat the seat score tries fit
 * every v1 layout inside its ideal ranges, though in small rooms the
 * speakers end up close to the MLP. The seat score installs its candidate
 * stages by the same rules (placeSpeakers).
 */
import {
  angleOnSide,
  azimuthFromSide,
  CHANNELS,
  type AngleRange,
  type ChannelId,
  type ChannelReference,
} from './dolby-layouts'
import type { IdealGap } from './ideal-gap'
import { clamp, insetRange } from './range'
import {
  EAR_HEIGHT,
  FRONT_STAGE_WALL_DISTANCE,
  LEFT_RIGHT_AIM,
  LISTENER_LEVEL_AIM,
  SCREEN_FRONT_STAGE,
  SPEAKER_WALL_CLEARANCE,
} from './reference'
import {
  azimuthFromMlp,
  bearingTo,
  directionAtAzimuth,
  WALLS,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'
import { screenSurface, type RoomScreen } from './screen'

/** Which way a speaker faces. */
export type Aim = {
  /**
   * The direction its front faces seen from above: degrees clockwise from
   * facing the front wall, in (-180°, +180°]. 180° faces the back wall.
   */
  readonly yaw: number
}

/**
 * How a front-stage speaker relates to the Screen (rule 6), for the
 * details panel. Only Left, Center and Right have one, and only when the
 * Room has a screen.
 *
 * - `outside-edge`: L/R just outside a TV's or solid screen's edge, as
 *   seen from the MLP.
 * - `inside-edge`: L/R behind an acoustically transparent screen, just
 *   inside its edge.
 * - `clamped`: the screen's edge asked for `screenAngle` (degrees on the
 *   speaker's side), outside Dolby's ideal range, so the speaker sits at
 *   Dolby's `dolbyAngle` instead: the range's `min` (a screen narrower
 *   than Dolby's range: L/R beside it) or `max` (a screen wider than it:
 *   L/R in front of the image, or behind it when `behindScreen`).
 * - `below`, `above`: C just below or above a TV or solid screen.
 * - `behind`: C behind an acoustically transparent screen.
 * - `in-front`: C at ear height in front of a solid image, as neither
 *   below nor above it fits between the floor and the ceiling.
 * - `clear`: C at ear height, where the image doesn't cover it.
 * - `manual`: placed by hand, so the rule doesn't move it.
 */
export type ScreenRelation =
  | { readonly kind: 'outside-edge' | 'inside-edge' }
  | {
      readonly kind: 'clamped'
      readonly limit: 'min' | 'max'
      readonly screenAngle: number
      readonly dolbyAngle: number
      readonly behindScreen: boolean
    }
  | {
      readonly kind:
        'below' | 'above' | 'behind' | 'in-front' | 'clear' | 'manual'
    }

/**
 * An auto-placed speaker, how it relates to the screen (null when it
 * doesn't), and why its grade can't be ideal (null when it is; rule 7).
 */
export type AutoPlacedSpeaker = {
  readonly position: RoomPoint
  readonly screenRelation: ScreenRelation | null
  readonly idealGap: IdealGap | null
}

/**
 * Where a listener-level channel goes around the MLP, with a screen or
 * without one (null), and how it relates to the screen.
 *
 * ## With a screen (rule 6)
 *
 * - **Front-stage line**: in front of a TV or solid screen the front stage
 *   stays FRONT_STAGE_WALL_DISTANCE from the wall. Behind an acoustically
 *   transparent screen it moves nearer the wall when it must, to stay
 *   SCREEN_FRONT_STAGE.behindScreenGap behind the screen; when that would
 *   leave less than the wall clearance (a screen less than 0.4 m off the
 *   wall), there is no room behind it, and it counts as a solid screen.
 * - **L/R at the screen edges**: each aims where its own edge of the image
 *   is seen from the MLP on the front-stage line, moved
 *   SCREEN_FRONT_STAGE.edgeClearance outward (inward behind a transparent
 *   screen). That angle is then clamped into Dolby's ideal range: Dolby's
 *   cited range wins, and the relation says when it did.
 * - **C**: on its 0° azimuth as before. Behind a transparent screen it
 *   stays at ear height. In front of a solid image that covers ear height
 *   it goes SCREEN_FRONT_STAGE.centerClearance below or above the image as
 *   seen from the MLP, whichever is nearer ear height and fits between the
 *   floor and the ceiling (below on a tie); if neither fits, it stays at
 *   ear height in front of the image.
 * - Every other channel is placed as without a screen.
 */
export function autoPlaceSpeakerAtScreen(
  room: Room,
  mlp: RoomPoint,
  reference: ChannelReference,
  screen: RoomScreen | null,
  frontStageDistance: number,
): AutoPlacedSpeaker {
  const { channel } = reference
  if (screen === null || !FRONT_STAGE_CHANNELS.has(channel)) {
    return {
      ...nearIdeal(
        room,
        mlp,
        reference,
        autoAzimuth(reference),
        frontLineFor(channel, frontStageDistance),
      ),
      screenRelation: null,
    }
  }
  const stage = frontStageAt(screen)
  return channel === 'C'
    ? placeCenterAtScreen(room, mlp, reference, stage)
    : placeSideAtScreen(room, mlp, reference, stage)
}

/** How a manual speaker relates to the screen: null unless it is L, C or R in a Room with one. */
export function manualScreenRelation(
  channel: ChannelId,
  screen: RoomScreen | null,
): ScreenRelation | null {
  return screen !== null && FRONT_STAGE_CHANNELS.has(channel)
    ? { kind: 'manual' }
    : null
}

/**
 * How far from the front wall the front stage (Left, Center and Right)
 * stands when auto-placed with `screen`: FRONT_STAGE_WALL_DISTANCE, or
 * nearer the wall behind an acoustically transparent screen ("With a
 * screen" above). Without a screen this is only the fallback: auto-place
 * chooses the distance per seat (rule 2, frontStageDistance in
 * front-wall-distance.ts).
 */
export function frontStageLine(screen: RoomScreen | null): number {
  return screen === null
    ? FRONT_STAGE_WALL_DISTANCE.meters
    : frontStageAt(screen).line
}

/**
 * The azimuth auto-place aims a channel at without a screen, signed on its
 * side (rule 1): LEFT_RIGHT_AIM for Left and Right, the middle of the
 * ideal range in whole degrees for every other channel.
 */
function autoAzimuth({
  channel,
  azimuth: { ideal },
}: ChannelReference): number {
  const angle =
    channel === 'L' || channel === 'R'
      ? leftRightAngle(ideal.range)
      : Math.round((ideal.range.min + ideal.range.max) / 2)
  return azimuthFromSide(CHANNELS[channel].side, angle)
}

/**
 * Dolby's 30° L/R reference, kept LEFT_RIGHT_AIM.edgeMargin inside the
 * ideal range's edge, and never below the range (rule 1).
 */
function leftRightAngle({ min, max }: AngleRange): number {
  const { nominal, edgeMargin } = LEFT_RIGHT_AIM
  return clamp(nominal, min, max - edgeMargin)
}

/**
 * How far from the front wall a channel stops without a screen (rules 2
 * and 3): the front stage at `frontStageDistance`, every other channel at
 * the wall clearance.
 */
function frontLineFor(channel: ChannelId, frontStageDistance: number): number {
  return FRONT_STAGE_CHANNELS.has(channel)
    ? frontStageDistance
    : SPEAKER_WALL_CLEARANCE.meters
}

/** Where a speaker went, and why its grade can't be ideal (null when it is). */
type Reached = Pick<AutoPlacedSpeaker, 'position' | 'idealGap'>

/**
 * Rule 7: the point along `aim` (a signed azimuth inside the channel's
 * ideal range) from the MLP where the walls stop it, at ear height. Where
 * that leaves the speaker on the MLP, the nearest whole-degree azimuth
 * that doesn't: in the ideal range LISTENER_LEVEL_AIM.edgeMargin inside
 * its edges, then up to its edges; failing those (an ideal gap), in the
 * acceptable range, then anywhere.
 */
function nearIdeal(
  room: Room,
  mlp: RoomPoint,
  reference: ChannelReference,
  aim: number,
  frontLine: number,
): Reached {
  const reach = (azimuth: number) => reachAlong(room, mlp, azimuth, frontLine)
  const at = (azimuth: number): RoomPoint => {
    const { distance } = reach(azimuth)
    const { dx, dy } = directionAtAzimuth(mlp, azimuth)
    return {
      x: mlp.x + distance * dx,
      y: mlp.y + distance * dy,
      z: EAR_HEIGHT.meters,
    }
  }
  const fits = (azimuth: number) =>
    reach(azimuth).distance >= LISTENER_LEVEL_AIM.minimumDistance
  if (fits(aim)) return { position: at(aim), idealGap: null }

  const { side } = CHANNELS[reference.channel]
  const { ideal, acceptable } = reference.azimuth
  // The fitting whole-degree azimuth of `range` (on the channel's side)
  // nearest the aim; the one nearer the front on a tie.
  const nearest = (range: AngleRange | null) =>
    range === null
      ? undefined
      : wholeDegrees(range)
          .map((angle) => azimuthFromSide(side, angle))
          .sort(
            (a, b) =>
              degreesApart(a, aim) - degreesApart(b, aim) ||
              Math.abs(a) - Math.abs(b),
          )
          .find(fits)
  const idealAzimuth =
    nearest(insetRange(ideal.range, LISTENER_LEVEL_AIM.edgeMargin)) ??
    nearest(ideal.range)
  if (idealAzimuth !== undefined) {
    return { position: at(idealAzimuth), idealGap: null }
  }
  const fallback = nearest(acceptable.range) ?? nearest(EVERY_ANGLE) ?? aim
  const walls = wholeDegrees(ideal.range).flatMap(
    (angle) => reach(azimuthFromSide(side, angle)).walls,
  )
  return {
    position: at(fallback),
    idealGap: {
      channel: reference.channel,
      angles: [{ angle: 'azimuth', ideal: ideal.range }],
      together: false,
      walls: WALLS.filter((wall) => walls.includes(wall)),
    },
  }
}

/**
 * Every angle on a channel's own side as Dolby measures it (rule 7's last
 * resort): from straight ahead round to straight behind on its side, and
 * negative on the far side.
 */
const EVERY_ANGLE: AngleRange = { min: -179, max: 180 }

/** How many degrees apart two azimuths are, the short way round. */
function degreesApart(a: number, b: number): number {
  const apart = Math.abs(a - b) % 360
  return Math.min(apart, 360 - apart)
}

/** The whole degrees of a range, from its min up. */
function wholeDegrees({ min, max }: AngleRange): number[] {
  const degrees: number[] = []
  for (let angle = Math.ceil(min); angle <= max; angle += 1) {
    degrees.push(angle)
  }
  return degrees
}

/** The front stage with a screen (see "With a screen" above). */
type FrontStage = {
  readonly screen: RoomScreen
  /** How far from the front wall the front stage stands. */
  readonly line: number
  /** Whether it stands behind an acoustically transparent screen. */
  readonly behind: boolean
}

/** Where the front stage stands with `screen` (see "With a screen" above). */
function frontStageAt(screen: RoomScreen): FrontStage {
  const front = FRONT_STAGE_WALL_DISTANCE.meters
  if (screen.standoff !== null) {
    const behindLine = screen.standoff - SCREEN_FRONT_STAGE.behindScreenGap
    if (behindLine >= SPEAKER_WALL_CLEARANCE.meters - EPSILON) {
      return { screen, line: Math.min(front, behindLine), behind: true }
    }
  }
  return { screen, line: front, behind: false }
}

/**
 * From the screen's plane to a plane `y` from the front wall, as seen from
 * the MLP: a point on the screen `s` off the MLP is seen on the plane
 * `s * scale` off it (more than 1 behind the screen). 1 when the MLP is
 * not in front of both planes.
 */
function seenScale(mlp: RoomPoint, screenY: number, y: number): number {
  const toScreen = mlp.y - screenY
  const toPlane = mlp.y - y
  return toScreen > EPSILON && toPlane > EPSILON ? toPlane / toScreen : 1
}

/** L or R at its edge of the screen, clamped into Dolby's ideal range. */
function placeSideAtScreen(
  room: Room,
  mlp: RoomPoint,
  reference: ChannelReference,
  { screen, line, behind }: FrontStage,
): AutoPlacedSpeaker {
  const { side } = CHANNELS[reference.channel]
  const image = screenSurface(screen)
  const y = effectiveFrontLine(mlp, line)
  const scale = seenScale(mlp, image.fromFrontWall, y)
  // Outward is toward the speaker's own side wall.
  const outward = side === 'left' ? -1 : 1
  const edge = side === 'left' ? image.left : image.right
  const clearance =
    SCREEN_FRONT_STAGE.edgeClearance * (behind ? -outward : outward)
  const target: RoomPoint = {
    x: mlp.x + (edge - mlp.x) * scale + clearance,
    y,
    z: mlp.z,
  }
  const screenAngle = angleOnSide(side, azimuthFromMlp(mlp, target))
  const { min, max } = reference.azimuth.ideal.range
  const angle = clamp(screenAngle, min, max)
  const reached = nearIdeal(
    room,
    mlp,
    reference,
    azimuthFromSide(side, angle),
    line,
  )
  if (angle === screenAngle) {
    return {
      ...reached,
      screenRelation: { kind: behind ? 'inside-edge' : 'outside-edge' },
    }
  }
  return {
    ...reached,
    screenRelation: {
      kind: 'clamped',
      limit: angle === min ? 'min' : 'max',
      screenAngle,
      dolbyAngle: angle,
      behindScreen: behind && angle === max,
    },
  }
}

/** C on its 0° azimuth: behind, below, above or in front of the screen, or clear of it. */
function placeCenterAtScreen(
  room: Room,
  mlp: RoomPoint,
  reference: ChannelReference,
  { screen, line, behind }: FrontStage,
): AutoPlacedSpeaker {
  const { position: atEar, idealGap } = nearIdeal(
    room,
    mlp,
    reference,
    autoAzimuth(reference),
    line,
  )
  const image = screenSurface(screen)
  // The image's edges as seen from the MLP on the Center's plane.
  const scale = seenScale(mlp, image.fromFrontWall, atEar.y)
  const seen = (edge: number, from: number) => from + (edge - from) * scale
  const left = seen(image.left, mlp.x)
  const right = seen(image.right, mlp.x)
  const bottom = seen(image.bottom, mlp.z)
  const top = seen(image.top, mlp.z)
  const ear = atEar.z
  // Behind a transparent screen the cabinet may sit right behind the
  // image; in front of a solid one it must clear it.
  const across = behind ? 0 : SCREEN_FRONT_STAGE.edgeClearance
  const up = behind ? 0 : SCREEN_FRONT_STAGE.centerClearance
  const covered =
    atEar.x >= left - across &&
    atEar.x <= right + across &&
    ear >= bottom - up &&
    ear <= top + up
  if (!covered) {
    return { position: atEar, idealGap, screenRelation: { kind: 'clear' } }
  }
  if (behind) {
    return { position: atEar, idealGap, screenRelation: { kind: 'behind' } }
  }
  const fits = (z: number) =>
    z >= up - EPSILON && z <= room.height - up + EPSILON
  const below = bottom - up
  const above = top + up
  const options = [
    ...(fits(below) ? [{ kind: 'below' as const, z: below }] : []),
    ...(fits(above) ? [{ kind: 'above' as const, z: above }] : []),
  ]
  // Nearest ear height wins; below comes first, so it wins a tie.
  const [nearest] = options.sort(
    (a, b) => Math.abs(a.z - ear) - Math.abs(b.z - ear),
  )
  if (nearest === undefined) {
    return { position: atEar, idealGap, screenRelation: { kind: 'in-front' } }
  }
  return {
    position: { ...atEar, z: nearest.z },
    idealGap,
    screenRelation: { kind: nearest.kind },
  }
}

/**
 * The front-stage channels, Left, Center and Right: the ones auto-place
 * puts near the front wall (rule 2 above).
 */
export const FRONT_STAGE_CHANNELS: ReadonlySet<ChannelId> = new Set([
  'L',
  'C',
  'R',
])

/** Whether `channel` is on the front stage: L, C or R. */
export function isFrontStageChannel(channel: ChannelId): boolean {
  return FRONT_STAGE_CHANNELS.has(channel)
}

/** Turn a speaker at `position` to face the MLP (rule 5 above). */
export function aimAtMlp(position: RoomPoint, mlp: RoomPoint): Aim {
  return { yaw: bearingTo(position, mlp) }
}

/** How far the MLP can look along an azimuth, and what stops it short. */
type Reach = {
  readonly distance: number
  /**
   * The walls whose clearance (or the front-stage line, for the front
   * wall) leaves less than LISTENER_LEVEL_AIM.minimumDistance along it:
   * none when the speaker fits.
   */
  readonly walls: readonly Wall[]
}

/**
 * How far the MLP can look along `azimuth` before it comes within the wall
 * clearance of a side or back wall, or within `frontLine` of the front
 * wall. A front line behind the MLP falls back to the wall clearance.
 */
function reachAlong(
  room: Room,
  mlp: RoomPoint,
  azimuth: number,
  frontLine: number,
): Reach {
  const { dx, dy } = directionAtAzimuth(mlp, azimuth)
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const front = effectiveFrontLine(mlp, frontLine)
  const xLimit = room.width / 2 - clearance
  const limits: readonly (readonly [Wall, number])[] = [
    [dx > 0 ? 'right' : 'left', distanceAlong(mlp.x, dx, -xLimit, xLimit)],
    [
      dy > 0 ? 'back' : 'front',
      distanceAlong(mlp.y, dy, front, room.length - clearance),
    ],
  ]
  const distance = Math.max(0, Math.min(...limits.map(([, along]) => along)))
  const walls = limits
    .filter(([, along]) => along < LISTENER_LEVEL_AIM.minimumDistance)
    .map(([wall]) => wall)
  return { distance, walls }
}

/**
 * Where reachAlong stops at the front: `frontLine` from the front
 * wall, or the wall clearance when the MLP is not behind that line by
 * LISTENER_LEVEL_AIM.minimumDistance at least (rule 7: the line would
 * leave the front stage on the MLP).
 */
function effectiveFrontLine(mlp: RoomPoint, frontLine: number): number {
  return mlp.y >= frontLine + LISTENER_LEVEL_AIM.minimumDistance
    ? frontLine
    : SPEAKER_WALL_CLEARANCE.meters
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
