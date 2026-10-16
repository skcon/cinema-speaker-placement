/**
 * The Screen (GLOSSARY.md): the TV or projection screen on the front wall,
 * a room object. It is drawn, and later used by auto-place (#58), but it
 * is never part of the estimated response (ADR 0006).
 *
 * It hangs on the front wall (y = 0), or, when it is an acoustically
 * transparent projection screen, stands `standoff` in front of it with the
 * front speakers behind it. It stays inside the Room: on the front wall
 * between the side walls, and between the floor and the ceiling.
 */
import { ROUNDING_SLACK, toMillimeter } from './manual-positions'
import {
  checkRange,
  clamp,
  type AcceptedRange,
  type RangeProblem,
} from './range'
import { EAR_HEIGHT, SCREEN } from './reference'
import type { Room } from './room'

/** What the screen is: a TV, or a screen a projector shines on. */
export const SCREEN_KINDS = ['tv', 'projection'] as const

export type ScreenKind = (typeof SCREEN_KINDS)[number]

/** A screen on the front wall, in meters (see above). */
export type RoomScreen = {
  kind: ScreenKind
  /** The image's width, side to side. */
  width: number
  /** The image's height. */
  height: number
  /** How high the image's bottom edge is above the floor. */
  bottomEdge: number
  /** Where its middle is across the room, in room x: 0 is centred. */
  x: number
  /**
   * null for a screen on the front wall. For an acoustically transparent
   * projection screen, how far it stands in front of the front wall, with
   * the front speakers behind it.
   */
  standoff: number | null
}

/**
 * A screen's dimensions that are edited as lengths. Where it is along the
 * front wall is edited as `fromLeftWall`: from the left wall to its left
 * edge, which is never negative.
 */
export type ScreenDimension =
  'width' | 'height' | 'bottomEdge' | 'fromLeftWall' | 'standoff'

/**
 * The accepted range of each of a screen's dimensions in `room`, given
 * its other dimensions: SCREEN's limits, kept on the front wall and under
 * the ceiling. A wider screen moves in from a side wall instead (see
 * withScreenDimension), so its width is only limited by the front wall.
 */
export function screenLimits(
  room: Room,
  screen: RoomScreen,
): Record<ScreenDimension, AcceptedRange> {
  const { width, height, bottomEdge, standoff } = SCREEN.limits
  const along = alongWall(room, screen.width)
  return {
    width: { min: width.min, max: Math.min(width.max, room.width) },
    height: {
      min: height.min,
      max: Math.min(height.max, room.height - screen.bottomEdge),
    },
    bottomEdge: {
      min: bottomEdge.min,
      max: Math.min(bottomEdge.max, room.height - screen.height),
    },
    fromLeftWall: { min: 0, max: 2 * along },
    standoff,
  }
}

/** How far a screen `width` wide may move its middle off the centre line. */
function alongWall(room: Room, width: number): number {
  return Math.max(0, (room.width - width) / 2)
}

/**
 * One of the screen's dimensions in `room`, in meters: null for the
 * standoff of a screen on the wall.
 */
export function screenDimension(
  room: Room,
  screen: RoomScreen,
  dimension: ScreenDimension,
): number | null {
  return dimension === 'fromLeftWall'
    ? screen.x - screen.width / 2 + room.width / 2
    : screen[dimension]
}

/** `null` when `meters` is an accepted `dimension` for the screen in this room. */
export function checkScreenDimension(
  room: Room,
  screen: RoomScreen,
  dimension: ScreenDimension,
  meters: number,
): RangeProblem | null {
  return checkRange(meters, screenLimits(room, screen)[dimension])
}

/**
 * Whether the screen is one a config may hold in `room`: every dimension
 * in range, a standoff only on a projection screen, and its middle on the
 * front wall to the millimeter (share links round it, see
 * roundScreenForLink).
 */
export function isValidScreen(room: Room, screen: RoomScreen): boolean {
  const limits = screenLimits(room, screen)
  const inRange = (dimension: 'width' | 'height' | 'bottomEdge') =>
    checkRange(screen[dimension], limits[dimension]) === null
  const along = alongWall(room, screen.width)
  const onWall =
    checkRange(screen.x, {
      min: -along - ROUNDING_SLACK,
      max: along + ROUNDING_SLACK,
    }) === null
  const standoff =
    screen.standoff === null ||
    (screen.kind === 'projection' &&
      checkRange(screen.standoff, limits.standoff) === null)
  return (
    inRange('width') &&
    inRange('height') &&
    inRange('bottomEdge') &&
    onWall &&
    standoff
  )
}

/**
 * The screen a Room gets when one is added: SCREEN's default TV, centred
 * on the front wall, its bottom edge where seated ear height crosses the
 * image at SCREEN.eyeLineFraction, fitted into the room.
 */
export function defaultScreen(room: Room): RoomScreen {
  const { width, height } = SCREEN.defaultTv
  return fitScreenToRoom(room, {
    kind: 'tv',
    width,
    height,
    bottomEdge: toMillimeter(
      EAR_HEIGHT.meters - height * SCREEN.eyeLineFraction,
    ),
    x: 0,
    standoff: null,
  })
}

/**
 * The screen with one dimension changed, or null when the value is
 * rejected (see checkScreenDimension). A wider screen moves in from a side
 * wall it would cross; a standoff is only set on an acoustically
 * transparent screen.
 */
export function withScreenDimension(
  room: Room,
  screen: RoomScreen,
  dimension: ScreenDimension,
  meters: number,
): RoomScreen | null {
  if (checkScreenDimension(room, screen, dimension, meters) !== null) {
    return null
  }
  switch (dimension) {
    case 'standoff':
      return screen.standoff === null ? null : { ...screen, standoff: meters }
    case 'fromLeftWall':
      return { ...screen, x: meters + screen.width / 2 - room.width / 2 }
    case 'width':
      return keepOnWall(room, { ...screen, width: meters })
    default:
      return { ...screen, [dimension]: meters }
  }
}

/** The screen dragged along the front wall to `x`, stopped at the side walls. */
export function screenMovedTo(
  room: Room,
  screen: RoomScreen,
  x: number,
): RoomScreen {
  if (!Number.isFinite(x)) return screen
  const moved = keepOnWall(room, { ...screen, x })
  return moved.x === screen.x ? screen : moved
}

/** The screen's middle moved in, if needed, so it stays between the side walls. */
function keepOnWall(room: Room, screen: RoomScreen): RoomScreen {
  const along = alongWall(room, screen.width)
  const x = clamp(screen.x, -along, along)
  return x === screen.x ? screen : { ...screen, x }
}

/**
 * The screen as another kind, keeping its size. A TV hangs on the wall, so
 * it drops any standoff.
 */
export function withScreenKind(
  screen: RoomScreen,
  kind: ScreenKind,
): RoomScreen {
  if (kind === screen.kind) return screen
  return kind === 'tv'
    ? { ...screen, kind, standoff: null }
    : { ...screen, kind }
}

/**
 * A projection screen made acoustically transparent (at SCREEN's default
 * standoff, or the one it has) or put back on the wall. A TV stays as it is.
 */
export function withAcousticTransparency(
  screen: RoomScreen,
  transparent: boolean,
): RoomScreen {
  if (screen.kind === 'tv' || transparent === (screen.standoff !== null)) {
    return screen
  }
  return { ...screen, standoff: transparent ? SCREEN.defaultStandoff : null }
}

/**
 * The screen moved and sized, if needed, so it fits `room` (after the Room
 * shrinks): narrowed to the front wall and moved in from a side wall, its
 * bottom edge lowered under the ceiling and then, if that isn't enough, its
 * height. A screen that fits comes back as it was.
 */
export function fitScreenToRoom(room: Room, screen: RoomScreen): RoomScreen {
  const { limits } = SCREEN
  const width = Math.min(screen.width, room.width, limits.width.max)
  const height = Math.min(screen.height, room.height, limits.height.max)
  const bottomEdge = clamp(
    screen.bottomEdge,
    limits.bottomEdge.min,
    Math.min(limits.bottomEdge.max, room.height - height),
  )
  const sized =
    width === screen.width &&
    height === screen.height &&
    bottomEdge === screen.bottomEdge
      ? screen
      : { ...screen, width, height, bottomEdge }
  return keepOnWall(room, sized)
}

/** The screen as a share link stores it: its position to the millimeter. */
export function roundScreenForLink(screen: RoomScreen): RoomScreen {
  return { ...screen, x: toMillimeter(screen.x) }
}

/** Where the screen's image is, in room coordinates (meters). */
export type ScreenSurface = {
  /** Its left and right edges, in room x. */
  left: number
  right: number
  /** Its bottom and top edges, above the floor. */
  bottom: number
  top: number
  /** How far in front of the front wall it is (0 on the wall). */
  fromFrontWall: number
}

/** Where the screen's image is in the room. */
export function screenSurface(screen: RoomScreen): ScreenSurface {
  const half = screen.width / 2
  return {
    left: screen.x - half,
    right: screen.x + half,
    bottom: screen.bottomEdge,
    top: screen.bottomEdge + screen.height,
    fromFrontWall: screen.standoff ?? 0,
  }
}
