/**
 * The wall frame: where things are relative to one wall of the Room, for
 * everything that is wall-mounted or measured from a wall (openings, the
 * Screen, distances to the walls, first reflections, placement warnings
 * and the room view).
 *
 * Each wall has two floor axes:
 *
 * - **along**: along the wall, from its start. The front and back walls
 *   start at the left wall (so `along` is room x plus `width / 2`); the left
 *   and right walls start at the front wall (so `along` is room y). Mirrored
 *   walls (left and right) run the same way, so a mirrored point has the
 *   same `along` on the mirror wall.
 * - **out**: into the Room, square to the wall: 0 on the wall, negative
 *   behind it.
 *
 * Height (z) is the same in the wall frame as in room coordinates
 * (room.ts). The Room is rectangular, so each wall's frame is room x or y
 * shifted and, for the back and right walls, flipped: one table below
 * says which.
 */
import {
  WALLS,
  type FloorPoint,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'

/** A floor-plan point in one wall's frame (see above), in meters. */
export type WallFramePoint = { along: number; out: number }

/** A point on a wall: how far along it (from its start) and how high. */
export type WallPoint = { along: number; z: number }

/**
 * Each wall as the room axis it runs along, the wall it starts at, the
 * room axis square to it, where on that axis it is and which way is into
 * the Room. Everything below reads this one table.
 */
const FRAMES: Record<
  Wall,
  {
    along: 'x' | 'y'
    start: Wall
    out: 'x' | 'y'
    at: (room: Room) => number
    inward: 1 | -1
  }
> = {
  front: { along: 'x', start: 'left', out: 'y', at: () => 0, inward: 1 },
  back: {
    along: 'x',
    start: 'left',
    out: 'y',
    at: ({ length }) => length,
    inward: -1,
  },
  left: {
    along: 'y',
    start: 'front',
    out: 'x',
    at: ({ width }) => -width / 2,
    inward: 1,
  },
  right: {
    along: 'y',
    start: 'front',
    out: 'x',
    at: ({ width }) => width / 2,
    inward: -1,
  },
}

/** The wall `wall`'s `along` is measured from: the left or the front wall. */
export function wallStart(wall: Wall): Wall {
  return FRAMES[wall].start
}

/** How long `wall` is, corner to corner, in meters. */
export function wallLength(room: Room, wall: Wall): number {
  return FRAMES[wall].along === 'x' ? room.width : room.length
}

/** Which way is into the Room from `wall`, as a unit direction on the floor plan. */
export function inwardDirection(wall: Wall): FloorPoint {
  const { out, inward } = FRAMES[wall]
  return out === 'x' ? { x: inward, y: 0 } : { x: 0, y: inward }
}

/**
 * The wall that mirrors `wall` across the centre line (room x to -x): the
 * left and right walls swap, the front and back walls stay.
 */
export function mirroredWall(wall: Wall): Wall {
  if (wall === 'left') return 'right'
  if (wall === 'right') return 'left'
  return wall
}

/** Where a floor-plan point is in `wall`'s frame (see above). */
export function toWallFrame(
  room: Room,
  wall: Wall,
  point: FloorPoint,
): WallFramePoint {
  const { along, start, out, at, inward } = FRAMES[wall]
  return {
    along: point[along] - FRAMES[start].at(room),
    out: inward * (point[out] - at(room)),
  }
}

/** The floor-plan point at `along` and `out` in `wall`'s frame (see above). */
export function fromWallFrame(
  room: Room,
  wall: Wall,
  point: WallFramePoint,
): FloorPoint {
  const { along, start, out, at, inward } = FRAMES[wall]
  const onWall = {
    [along]: point.along + FRAMES[start].at(room),
    [out]: at(room) + inward * point.out,
  } as Record<'x' | 'y', number>
  return { x: onWall.x, y: onWall.y }
}

/** How far a point is from a wall, in meters, measured along the floor. */
export function distanceToWall(
  room: Room,
  point: RoomPoint,
  wall: Wall,
): number {
  return toWallFrame(room, wall, point).out
}

/**
 * The point moved straight toward or away from `wall` until it is `meters`
 * from it; the other coordinates stay.
 */
export function atDistanceFromWall(
  room: Room,
  point: RoomPoint,
  wall: Wall,
  meters: number,
): RoomPoint {
  const { out, at, inward } = FRAMES[wall]
  return { ...point, [out]: at(room) + inward * meters }
}

/** The wall a point is closest to (the first, clockwise from the front wall, on a tie). */
export function nearestWall(room: Room, point: RoomPoint): Wall {
  return WALLS.reduce((nearest, wall) =>
    distanceToWall(room, point, wall) < distanceToWall(room, point, nearest)
      ? wall
      : nearest,
  )
}

/** A point's distance to one wall, in meters. */
export type WallDistance = { wall: Wall; meters: number }

/**
 * How far a point is from the walls nearest to it: the nearer side wall
 * (left or right) and the nearer end wall (front or back). Where it is
 * halfway, the left and front walls count as nearer.
 */
export function wallDistances(
  room: Room,
  point: RoomPoint,
): { across: WallDistance; along: WallDistance } {
  const nearer = (a: Wall, b: Wall): WallDistance => {
    const toA = distanceToWall(room, point, a)
    const toB = distanceToWall(room, point, b)
    return toB < toA ? { wall: b, meters: toB } : { wall: a, meters: toA }
  }
  return { across: nearer('left', 'right'), along: nearer('front', 'back') }
}

/**
 * Where on `wall` the first-order reflection from `source` to `listener`
 * hits it (the image-source point: the angle in equals the angle out), or
 * null when either is not inside the Room in front of the wall. The point
 * divides the way from source to listener in the ratio of their
 * distances to the wall.
 */
export function wallReflectionPoint(
  room: Room,
  wall: Wall,
  source: RoomPoint,
  listener: RoomPoint,
): WallPoint | null {
  const fromSource = distanceToWall(room, source, wall)
  const fromListener = distanceToWall(room, listener, wall)
  if (fromSource < 0 || fromListener < 0 || fromSource + fromListener === 0) {
    return null
  }
  const share = fromSource / (fromSource + fromListener)
  const at = (axis: 'x' | 'y' | 'z') =>
    source[axis] + (listener[axis] - source[axis]) * share
  return {
    along: toWallFrame(room, wall, { x: at('x'), y: at('y') }).along,
    z: at('z'),
  }
}
