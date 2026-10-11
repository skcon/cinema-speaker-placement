import { Box3, Mesh, OrthographicCamera, PlaneGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { Room, RoomPoint } from '@/domain'
import {
  floorGrid,
  floorPlane,
  toScenePosition,
  topDownCamera,
} from '@/scene/top-down'

const ROOM: Room = { length: 6, width: 4.5, height: 2.6 }

/**
 * Where a room point lands on screen, in pixels from the top-left corner,
 * using a Three.js camera set up the way react-three-fiber sets up a default
 * orthographic camera (frustum = canvas size in pixels, scaled by zoom).
 */
function project(
  point: RoomPoint,
  room: Room,
  size: { width: number; height: number },
) {
  const { position, rotation, zoom, near, far } = topDownCamera(room, size)
  const camera = new OrthographicCamera(
    -size.width / 2,
    size.width / 2,
    size.height / 2,
    -size.height / 2,
    near,
    far,
  )
  camera.position.set(...position)
  camera.rotation.set(...rotation)
  camera.zoom = zoom
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()
  const ndc = new Vector3(...toScenePosition(point)).project(camera)
  return {
    x: ((ndc.x + 1) / 2) * size.width,
    y: ((1 - ndc.y) / 2) * size.height,
    depth: ndc.z,
  }
}

describe('room points in the scene', () => {
  it('maps room x, y, z to Three.js x, z, y (Three.js has y up)', () => {
    expect(toScenePosition({ x: 1, y: 2, z: 3 })).toEqual([1, 3, 2])
  })
})

describe('the room drawing', () => {
  it('draws grid lines every meter, through the center line and from the front wall', () => {
    const grid = floorGrid(ROOM, 1)

    expect(grid.across.map(([from]) => from.x)).toEqual([-2, -1, 0, 1, 2])
    expect(grid.down.map(([from]) => from.y)).toEqual([1, 2, 3, 4, 5])
    expect(grid.across[0]).toEqual([
      { x: -2, y: 0, z: 0 },
      { x: -2, y: 6, z: 0 },
    ])
    expect(grid.down[0]).toEqual([
      { x: -2.25, y: 1, z: 0 },
      { x: 2.25, y: 1, z: 0 },
    ])
  })

  it('leaves out grid lines that would fall on a wall', () => {
    const grid = floorGrid({ length: 2, width: 2, height: 2.4 }, 1)

    expect(grid.across.map(([from]) => from.x)).toEqual([0])
    expect(grid.down.map(([from]) => from.y)).toEqual([1])
  })

  it('lays the floor plane flat over the whole floor', () => {
    const { position, rotation, size } = floorPlane(ROOM)
    const floor = new Mesh(new PlaneGeometry(...size))
    floor.position.set(...position)
    floor.rotation.set(...rotation)
    floor.updateMatrixWorld()

    const box = new Box3().setFromObject(floor)
    // Three.js x = room x, Three.js z = room y, Three.js y = height
    expect(box.min.x).toBeCloseTo(-2.25, 9)
    expect(box.max.x).toBeCloseTo(2.25, 9)
    expect(box.min.z).toBeCloseTo(0, 9)
    expect(box.max.z).toBeCloseTo(6, 9)
    expect(box.min.y).toBeCloseTo(0, 9)
    expect(box.max.y).toBeCloseTo(0, 9)
  })

  it('can space the grid a foot apart', () => {
    const grid = floorGrid(ROOM, 0.3048)

    // 7 ft = 2.13 m on each side of the center line; 19 ft = 5.79 m deep
    expect(grid.across).toHaveLength(15)
    expect(grid.down).toHaveLength(19)
  })
})

describe('the top-down camera', () => {
  const size = { width: 900, height: 600 }

  it('puts the front wall at the top and the back wall at the bottom', () => {
    const front = project({ x: 0, y: 0, z: 0 }, ROOM, size)
    const back = project({ x: 0, y: ROOM.length, z: 0 }, ROOM, size)

    expect(front.y).toBeLessThan(back.y)
  })

  it("puts the listener's right (+x) on the right of the view", () => {
    const left = project({ x: -ROOM.width / 2, y: 3, z: 0 }, ROOM, size)
    const right = project({ x: ROOM.width / 2, y: 3, z: 0 }, ROOM, size)

    expect(left.x).toBeLessThan(right.x)
  })

  it('centers the room in the view', () => {
    const center = project({ x: 0, y: ROOM.length / 2, z: 0 }, ROOM, size)

    expect(center.x).toBeCloseTo(450, 6)
    expect(center.y).toBeCloseTo(300, 6)
  })

  it('fits the room to the panel with a 32 px margin for labels, keeping it to scale', () => {
    // 6 m must fit 600 - 64 = 536 px (89.3 px/m); 4.5 m across 900 - 64 =
    // 836 px would allow 185.8 px/m, so length decides.
    expect(topDownCamera(ROOM, size).zoom).toBeCloseTo(89.333, 3)

    const front = project({ x: 0, y: 0, z: 0 }, ROOM, size)
    const back = project({ x: 0, y: ROOM.length, z: 0 }, ROOM, size)
    const left = project({ x: -ROOM.width / 2, y: 0, z: 0 }, ROOM, size)
    const right = project({ x: ROOM.width / 2, y: 0, z: 0 }, ROOM, size)
    // 6 m and 4.5 m at the same 89.3 px/m, 32 px from the top and bottom
    expect(front.y).toBeCloseTo(32, 6)
    expect(back.y).toBeCloseTo(568, 6)
    expect(right.x - left.x).toBeCloseTo(402, 6)
  })

  it('lets the width decide on a narrow panel', () => {
    // 4.5 m across 300 - 64 = 236 px = 52.4 px/m; 6 m down 836 px would
    // allow 139.3.
    expect(topDownCamera(ROOM, { width: 300, height: 900 }).zoom).toBeCloseTo(
      52.444,
      3,
    )
  })

  it('keeps the whole room between the near and far planes, ceiling included', () => {
    const floor = project({ x: 0, y: 3, z: 0 }, ROOM, size)
    const ceiling = project({ x: 0, y: 3, z: ROOM.height }, ROOM, size)

    for (const { depth } of [floor, ceiling]) {
      expect(depth).toBeGreaterThan(-1)
      expect(depth).toBeLessThan(1)
    }
  })

  it('falls back to a zoom of 1 before the panel has a size', () => {
    expect(topDownCamera(ROOM, { width: 0, height: 0 }).zoom).toBe(1)
  })
})
