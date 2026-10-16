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
import { linkSlack, toMillimeter } from './link-precision'
import {
  hasValidLengths,
  type LengthTolerance,
  type ObjectLengths,
} from './object-lengths'
import { clamp, type AcceptedRange } from './range'
import { EAR_HEIGHT, SCREEN } from './reference'
import type { Room } from './room'
import { fromWallFrame, toWallFrame } from './wall-frame'

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
 * A screen's dimensions that are edited as lengths (see SCREEN_LENGTHS).
 * Where it is along the front wall is edited as `fromLeftWall`: from the
 * left wall (the front wall's start in the wall frame, wall-frame.ts) to
 * its left edge, which is never negative. It is stored as its centred `x`.
 */
export type ScreenDimension =
  'width' | 'height' | 'bottomEdge' | 'fromLeftWall' | 'standoff'

/**
 * How far past the ceiling a stored screen's top edge may be, in meters:
 * float noise only, so a screen sized to fit (fitScreenToRoom, or a height
 * or bottom edge at its limit) always passes.
 */
const FIT_TOLERANCE = 1e-9

/**
 * How far past a side wall a stored screen's middle may be, in meters: a
 * share link writes it to the millimeter (link-precision.ts), which can put
 * a screen against the wall half a millimeter past it.
 */
const ROUNDING_SLACK = linkSlack('screen')

/**
 * The accepted range of each of a screen's dimensions in `room`, given
 * its other dimensions: SCREEN's limits, kept on the front wall and under
 * the ceiling. A wider screen moves in from a side wall instead (see
 * SCREEN_LENGTHS.set), so its width is only limited by the front wall.
 * Stored, its top edge may be FIT_TOLERANCE past the ceiling, and its
 * middle ROUNDING_SLACK past where it meets a side wall (share links
 * round it, see link-precision.ts); its sizes are stored as typed.
 */
function screenLimits(
  room: Room,
  screen: RoomScreen,
  tolerance: LengthTolerance,
): Record<ScreenDimension, AcceptedRange> {
  const { width, height, bottomEdge, standoff } = SCREEN.limits
  const stored = tolerance === 'stored'
  const ceiling = room.height + (stored ? FIT_TOLERANCE : 0)
  const slack = stored ? ROUNDING_SLACK : 0
  const reach = offCentreReach(room, screen.width)
  return {
    width: { min: width.min, max: Math.min(width.max, room.width) },
    height: {
      min: height.min,
      max: Math.min(height.max, ceiling - screen.bottomEdge),
    },
    bottomEdge: {
      min: bottomEdge.min,
      max: Math.min(bottomEdge.max, ceiling - screen.height),
    },
    // 0 - slack: +0 when typed, not -0.
    fromLeftWall: { min: 0 - slack, max: 2 * reach + slack },
    standoff,
  }
}

/** How far a screen `width` wide may move its middle off the centre line. */
function offCentreReach(room: Room, width: number): number {
  return Math.max(0, (room.width - width) / 2)
}

/**
 * Where the screen's left edge is along the front wall, from its start
 * (the left wall), in the wall frame (wall-frame.ts).
 */
function leftEdgeAlongWall(room: Room, screen: RoomScreen): number {
  const left = { x: screen.x - screen.width / 2, y: 0 }
  return toWallFrame(room, 'front', left).along
}

/** The room x of a screen middle `along` meters along the front wall. */
function middleAt(room: Room, along: number): number {
  return fromWallFrame(room, 'front', { along, out: 0 }).x
}

/**
 * The screen's lengths: its size, where it is along the front wall (from
 * the left wall to its left edge) and, standing in front of the wall, its
 * standoff. A wider screen moves in from a side wall it would cross.
 */
export const SCREEN_LENGTHS: ObjectLengths<RoomScreen, ScreenDimension> = {
  dimensions: ['width', 'height', 'bottomEdge', 'fromLeftWall', 'standoff'],
  limits: screenLimits,
  read: (room, screen, dimension) =>
    dimension === 'fromLeftWall'
      ? leftEdgeAlongWall(room, screen)
      : screen[dimension],
  set: (room, screen, dimension, meters) => {
    switch (dimension) {
      case 'fromLeftWall':
        return { ...screen, x: middleAt(room, meters + screen.width / 2) }
      case 'width':
        return keepOnWall(room, { ...screen, width: meters })
      default:
        return { ...screen, [dimension]: meters }
    }
  },
}

/**
 * Whether the screen is one a config may hold in `room`: every length in
 * its stored limits (so its top edge under the ceiling and its middle on
 * the front wall), and a standoff only on a projection screen.
 */
export function isValidScreen(room: Room, screen: RoomScreen): boolean {
  return (
    hasValidLengths(SCREEN_LENGTHS, room, screen) &&
    (screen.standoff === null || screen.kind === 'projection')
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
  const reach = offCentreReach(room, screen.width)
  const x = clamp(screen.x, -reach, reach)
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
