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
 * 6. **The Screen** (#58, ADR 0005 amendment), when the Room has one,
 *    moves L, C and R within their Dolby ranges (see "With a screen" at
 *    autoPlaceSpeakerAtScreen). Without one, rules 1-4 hold as they are.
 *
 * The MLP is always inside the clearance box (rooms are at least 2 m in
 * each direction), so every valid room fits every v1 layout inside its
 * ideal ranges, though in small rooms the speakers end up close to the MLP.
 * A manual MLP right against a wall can put a speaker on the MLP itself;
 * the analysis grades it like any other.
 */
import {
  angleOnSide,
  azimuthFromSide,
  CHANNELS,
  type AngleRange,
  type ChannelId,
  type ChannelReference,
} from './dolby-layouts'
import { clamp } from './range'
import {
  EAR_HEIGHT,
  FRONT_STAGE_WALL_DISTANCE,
  LEFT_RIGHT_AIM,
  SCREEN_FRONT_STAGE,
  SPEAKER_WALL_CLEARANCE,
} from './reference'
import {
  azimuthFromMlp,
  bearingTo,
  directionAtAzimuth,
  type Room,
  type RoomPoint,
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

/** Where a listener-level channel goes around the MLP (see the rule above). */
export function autoPlaceSpeaker(
  room: Room,
  mlp: RoomPoint,
  reference: ChannelReference,
  screen: RoomScreen | null = null,
): RoomPoint {
  return autoPlaceSpeakerAtScreen(room, mlp, reference, screen).position
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

/** An auto-placed speaker and how it relates to the screen (null when it doesn't). */
export type AutoPlacedSpeaker = {
  readonly position: RoomPoint
  readonly screenRelation: ScreenRelation | null
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
): AutoPlacedSpeaker {
  const { channel } = reference
  if (screen === null || !FRONT_STAGE_CHANNELS.has(channel)) {
    return {
      position: alongAzimuth(
        room,
        mlp,
        autoAzimuth(reference),
        frontLineFor(channel),
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
 * stands when auto-placed: FRONT_STAGE_WALL_DISTANCE, or nearer the wall
 * behind an acoustically transparent screen (rule 2; "With a screen"
 * above). The seat score keeps its seats behind it (SEATING_DISTANCE).
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

/** How far from the front wall a channel stops without a screen (rules 2 and 3). */
function frontLineFor(channel: ChannelId): number {
  return FRONT_STAGE_CHANNELS.has(channel)
    ? FRONT_STAGE_WALL_DISTANCE.meters
    : SPEAKER_WALL_CLEARANCE.meters
}

/** The point along `azimuth` from the MLP where the walls stop it, at ear height. */
function alongAzimuth(
  room: Room,
  mlp: RoomPoint,
  azimuth: number,
  frontLine: number,
): RoomPoint {
  const distance = distanceToWalls(room, mlp, azimuth, frontLine)
  const { dx, dy } = directionAtAzimuth(mlp, azimuth)
  return {
    x: mlp.x + distance * dx,
    y: mlp.y + distance * dy,
    z: EAR_HEIGHT.meters,
  }
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
  const position = alongAzimuth(room, mlp, azimuthFromSide(side, angle), line)
  if (angle === screenAngle) {
    return {
      position,
      screenRelation: { kind: behind ? 'inside-edge' : 'outside-edge' },
    }
  }
  return {
    position,
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
  const atEar = alongAzimuth(room, mlp, autoAzimuth(reference), line)
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
  if (!covered) return { position: atEar, screenRelation: { kind: 'clear' } }
  if (behind) return { position: atEar, screenRelation: { kind: 'behind' } }
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
    return { position: atEar, screenRelation: { kind: 'in-front' } }
  }
  return {
    position: { ...atEar, z: nearest.z },
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
  const front = effectiveFrontLine(mlp, frontLine)
  const xLimit = room.width / 2 - clearance
  const limits = [
    distanceAlong(mlp.x, dx, -xLimit, xLimit),
    distanceAlong(mlp.y, dy, front, room.length - clearance),
  ]
  return Math.max(0, Math.min(...limits))
}

/**
 * Where distanceToWalls stops at the front: `frontLine` from the front
 * wall, or the wall clearance when the MLP is not behind that line.
 */
function effectiveFrontLine(mlp: RoomPoint, frontLine: number): number {
  return mlp.y > frontLine ? frontLine : SPEAKER_WALL_CLEARANCE.meters
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
