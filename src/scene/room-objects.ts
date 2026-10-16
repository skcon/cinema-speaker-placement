import {
  formatLength,
  screenSurface,
  SEAT_ROW_HEAD_OFFSET,
  type RoomPoint,
  type RoomScreen,
  type SeatRow,
  type UnitSystem,
} from '@/domain'
import { toScenePosition, type Vec3 } from '@/scene/top-down'

/**
 * Pure geometry and words for the room objects in the room view (ADR
 * 0006): drawn, never part of the estimated response.
 */

/**
 * How deep the Screen's bar is drawn seen from above, in meters: a drawing
 * size only, deep enough to see and grab, not the depth of a TV.
 */
export const SCREEN_BAR_DEPTH = 0.08

/**
 * How far in front of its wall (or standoff) the 3D panel is drawn, in
 * meters, so it doesn't z-fight with the wall plane: a drawing offset only.
 */
const SCREEN_PANEL_OFFSET = 0.01

/** The Screen from above: a bar on the floor plan. */
export type ScreenBar = {
  /** The middle of the bar, on the floor. */
  center: RoomPoint
  /** Along the front wall. */
  width: number
  /** Into the room. */
  depth: number
}

/**
 * The Screen as a bar its width wide along the front wall, its back on the
 * wall (or, for an acoustically transparent screen, at its standoff) and
 * SCREEN_BAR_DEPTH deep into the room, so it never covers the "Front wall"
 * label outside the wall.
 */
export function screenBar(screen: RoomScreen): ScreenBar {
  const { fromFrontWall } = screenSurface(screen)
  return {
    center: { x: screen.x, y: fromFrontWall + SCREEN_BAR_DEPTH / 2, z: 0 },
    width: screen.width,
    depth: SCREEN_BAR_DEPTH,
  }
}

/**
 * The Screen in 3D: a panel in Three.js coordinates, upright and facing
 * into the room (a Three.js plane faces +z, which is room +y), from its
 * bottom edge up.
 */
export function screenPanel(screen: RoomScreen): {
  position: Vec3
  size: [width: number, height: number]
} {
  const { bottom, top, fromFrontWall } = screenSurface(screen)
  return {
    position: toScenePosition({
      x: screen.x,
      y: fromFrontWall + SCREEN_PANEL_OFFSET,
      z: (bottom + top) / 2,
    }),
    size: [screen.width, screen.height],
  }
}

/**
 * The Seat row in words, for the room view's screen-reader description,
 * for example "A seat row 2 m wide and 0.9 m deep, with the MLP 0.35 m in
 * front of its back; dragging it moves the MLP."
 */
export function describeSeatRow(
  { width, depth }: SeatRow,
  units: UnitSystem,
): string {
  const length = (meters: number) => formatLength(meters, units)
  return (
    `A seat row ${length(width)} wide and ${length(depth)} deep, with the ` +
    `MLP ${length(SEAT_ROW_HEAD_OFFSET)} in front of its back; dragging it ` +
    `moves the MLP.`
  )
}

/** Closer to the centre line than this (half a millimeter) counts as centred. */
const CENTRED_WITHIN = 0.0005

/**
 * The Screen in words, for the room view's screen-reader description, for
 * example "A TV on the front wall, 1.44 m wide and 0.81 m high, its bottom
 * edge 0.93 m above the floor, centred."
 */
export function describeScreen(screen: RoomScreen, units: UnitSystem): string {
  const length = (meters: number) => formatLength(meters, units)
  const what =
    screen.standoff !== null
      ? `An acoustically transparent projection screen ${length(screen.standoff)} in front of the front wall`
      : `${screen.kind === 'tv' ? 'A TV' : 'A projection screen'} on the front wall`
  const where =
    Math.abs(screen.x) < CENTRED_WITHIN
      ? 'centred'
      : `its middle ${length(Math.abs(screen.x))} ${screen.x < 0 ? 'left' : 'right'} of centre`
  return (
    `${what}, ${length(screen.width)} wide and ${length(screen.height)} ` +
    `high, its bottom edge ${length(screen.bottomEdge)} above the floor, ` +
    `${where}.`
  )
}
