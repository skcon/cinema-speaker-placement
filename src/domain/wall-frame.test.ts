import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, WALLS, type Room } from './room'
import {
  atDistanceFromWall,
  distanceToWall,
  fromWallFrame,
  inwardDirection,
  mirroredWall,
  nearestWall,
  toWallFrame,
  wallDistances,
  wallLength,
  wallReflectionPoint,
  wallStart,
} from './wall-frame'

/** The default room: 6 m long, 4.5 m wide (x from -2.25 to 2.25), 2.6 m high. */
const ROOM: Room = DEFAULT_ROOM

describe('the wall frame of each wall', () => {
  // A point 1 m right of centre, 2 m back from the front wall.
  const point = { x: 1, y: 2 }

  it.each([
    // along from the left wall, out from the front wall
    ['front', 'left', { along: 3.25, out: 2 }],
    // along from the left wall, out from the back wall
    ['back', 'left', { along: 3.25, out: 4 }],
    // along from the front wall, out from the left wall
    ['left', 'front', { along: 2, out: 3.25 }],
    // along from the front wall, out from the right wall
    ['right', 'front', { along: 2, out: 1.25 }],
  ] as const)(
    'measures along the %s wall from the %s wall, and out into the room',
    (wall, start, frame) => {
      expect(wallStart(wall)).toBe(start)
      expect(toWallFrame(ROOM, wall, point)).toEqual(frame)
      expect(fromWallFrame(ROOM, wall, frame)).toEqual(point)
    },
  )

  it.each([
    ['front', { x: -2.25, y: 0 }, { x: 2.25, y: 0 }],
    ['back', { x: -2.25, y: 6 }, { x: 2.25, y: 6 }],
    ['left', { x: -2.25, y: 0 }, { x: -2.25, y: 6 }],
    ['right', { x: 2.25, y: 0 }, { x: 2.25, y: 6 }],
  ] as const)(
    'runs the %s wall from its start corner to its far corner',
    (wall, start, end) => {
      expect(fromWallFrame(ROOM, wall, { along: 0, out: 0 })).toEqual(start)
      expect(
        fromWallFrame(ROOM, wall, { along: wallLength(ROOM, wall), out: 0 }),
      ).toEqual(end)
    },
  )

  it.each([
    ['front', 4.5],
    ['back', 4.5],
    ['left', 6],
    ['right', 6],
  ] as const)('is as long as the %s wall, corner to corner', (wall, meters) => {
    expect(wallLength(ROOM, wall)).toBe(meters)
  })

  it.each([
    ['front', { x: 0, y: 1 }],
    ['back', { x: 0, y: -1 }],
    ['left', { x: 1, y: 0 }],
    ['right', { x: -1, y: 0 }],
  ] as const)('points into the room from the %s wall', (wall, direction) => {
    expect(inwardDirection(wall)).toEqual(direction)
  })

  it('steps out from a wall along its inward direction', () => {
    for (const wall of WALLS) {
      const onWall = fromWallFrame(ROOM, wall, { along: 1, out: 0 })
      const inside = fromWallFrame(ROOM, wall, { along: 1, out: 0.5 })
      const inward = inwardDirection(wall)

      expect(inside.x - onWall.x).toBeCloseTo(inward.x * 0.5, 12)
      expect(inside.y - onWall.y).toBeCloseTo(inward.y * 0.5, 12)
    }
  })

  it('round-trips any floor point through every wall', () => {
    const points = [
      { x: -2.25, y: 0 },
      { x: 0.3, y: 4.7 },
      { x: 2.25, y: 6 },
      { x: -1.1, y: 0.01 },
    ]
    for (const wall of WALLS) {
      for (const at of points) {
        const back = fromWallFrame(ROOM, wall, toWallFrame(ROOM, wall, at))
        expect(back.x).toBeCloseTo(at.x, 12)
        expect(back.y).toBeCloseTo(at.y, 12)
      }
    }
  })

  it.each([
    ['left', 'right'],
    ['right', 'left'],
    ['front', 'front'],
    ['back', 'back'],
  ] as const)(
    'mirrors the %s wall across the centre line to the %s wall',
    (wall, mirror) => {
      expect(mirroredWall(wall)).toBe(mirror)
    },
  )

  it('mirrors a point on a side wall to the same place on the mirror wall', () => {
    const on = toWallFrame(ROOM, 'left', { x: -1, y: 2 })
    const mirrored = toWallFrame(ROOM, mirroredWall('left'), { x: 1, y: 2 })

    expect(mirrored).toEqual(on)
  })
})

describe('distances to the walls', () => {
  const point = { x: 1, y: 2, z: 1.2 }

  it.each([
    ['front', 2],
    ['back', 4],
    ['left', 3.25],
    ['right', 1.25],
  ] as const)('measures %s wall distance along the floor', (wall, meters) => {
    expect(distanceToWall(ROOM, point, wall)).toBeCloseTo(meters, 9)
    expect(distanceToWall(ROOM, point, wall)).toBe(
      toWallFrame(ROOM, wall, point).out,
    )
  })

  it.each([
    ['front', { x: 1, y: 0.5, z: 1.2 }],
    ['back', { x: 1, y: 5.5, z: 1.2 }],
    ['left', { x: -1.75, y: 2, z: 1.2 }],
    ['right', { x: 1.75, y: 2, z: 1.2 }],
  ] as const)(
    'moves a point straight to 0.5 m from the %s wall, keeping the rest',
    (wall, moved) => {
      const result = atDistanceFromWall(ROOM, point, wall, 0.5)

      expect(result.x).toBeCloseTo(moved.x, 9)
      expect(result.y).toBeCloseTo(moved.y, 9)
      expect(result.z).toBe(1.2)
      expect(distanceToWall(ROOM, result, wall)).toBeCloseTo(0.5, 9)
    },
  )

  it('finds the nearest wall', () => {
    expect(nearestWall(ROOM, { x: 2, y: 3, z: 0 })).toBe('right')
    expect(nearestWall(ROOM, { x: 0, y: 5.9, z: 0 })).toBe('back')
    expect(nearestWall(ROOM, { x: -2, y: 1, z: 0 })).toBe('left')
  })

  it('breaks a tie clockwise from the front wall: front, right, back, left', () => {
    // 0.5 m from the front and the right wall.
    expect(nearestWall(ROOM, { x: 1.75, y: 0.5, z: 0 })).toBe('front')
    // 0.5 m from the back and the left wall.
    expect(nearestWall(ROOM, { x: -1.75, y: 5.5, z: 0 })).toBe('back')
    // 0.5 m from the right and the back wall.
    expect(nearestWall(ROOM, { x: 1.75, y: 5.5, z: 0 })).toBe('right')
  })

  it('finds the nearer side wall and the nearer end wall, left and front on a tie', () => {
    expect(wallDistances(ROOM, { x: 1.5, y: 1, z: 1.2 })).toEqual({
      across: { wall: 'right', meters: 0.75 },
      along: { wall: 'front', meters: 1 },
    })
    expect(wallDistances(ROOM, { x: 0, y: 3, z: 0 })).toEqual({
      across: { wall: 'left', meters: 2.25 },
      along: { wall: 'front', meters: 3 },
    })
  })
})

describe('first reflections off a wall', () => {
  it('hits the wall where the angle in equals the angle out', () => {
    // Source 1 m and listener 3 m from the left wall, 4 m apart along it.
    const source = { x: -1.25, y: 1, z: 1.2 }
    const listener = { x: 0.75, y: 5, z: 1.2 }

    const point = wallReflectionPoint(ROOM, 'left', source, listener)

    expect(point?.along).toBeCloseTo(2, 12)
    expect(point?.z).toBeCloseTo(1.2, 12)
  })

  it('measures the point along the wall from its start, on every wall', () => {
    const source = { x: -0.25, y: 2, z: 1 }
    const listener = { x: 0.25, y: 4, z: 1.4 }

    for (const wall of WALLS) {
      const point = wallReflectionPoint(ROOM, wall, source, listener)
      const mirror = wallReflectionPoint(ROOM, wall, listener, source)
      expect(point).not.toBeNull()
      // Swapping source and listener hits the same point.
      expect(mirror?.along).toBeCloseTo(point?.along ?? NaN, 12)
      expect(mirror?.z).toBeCloseTo(point?.z ?? NaN, 12)
    }
    // 2.5 m and 2 m from the right wall: 2.5 / 4.5 of the way along.
    expect(
      wallReflectionPoint(ROOM, 'right', source, listener)?.along,
    ).toBeCloseTo(3 + 1 / 9, 12)
  })

  it('is null for a point outside the room behind the wall', () => {
    const outside = { x: -3, y: 2, z: 1 }
    const listener = { x: 0, y: 4, z: 1.2 }

    expect(wallReflectionPoint(ROOM, 'left', outside, listener)).toBeNull()
  })
})
