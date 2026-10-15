import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { Room, RoomPoint } from '@/domain'
import { orbitCamera, orbitLimits, roomBoxEdges } from '@/scene/orbit'
import { toScenePosition } from '@/scene/top-down'

const ROOM: Room = { length: 6, width: 4.5, height: 2.6 }

/** The room's eight corners, floor and ceiling. */
function corners({ length, width, height }: Room): RoomPoint[] {
  return [0, height].flatMap((z) =>
    [-width / 2, width / 2].flatMap((x) =>
      [0, length].map((y) => ({ x, y, z })),
    ),
  )
}

/** A Three.js perspective camera set up from orbitCamera, looking at its target. */
function cameraFor(room: Room, size: { width: number; height: number }) {
  const { position, target, fov, near, far } = orbitCamera(room, size)
  const camera = new PerspectiveCamera(fov, size.width / size.height, near, far)
  camera.position.set(...position)
  camera.lookAt(...target)
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()
  return camera
}

/** Normalized device coordinates of a room point: inside the view is -1..1 on every axis. */
function project(camera: PerspectiveCamera, point: RoomPoint) {
  return new Vector3(...toScenePosition(point)).project(camera)
}

describe('the 3D orbit camera', () => {
  it.each([
    ['landscape', { width: 900, height: 500 }],
    ['portrait', { width: 380, height: 700 }],
    ['square', { width: 600, height: 600 }],
  ])('shows the whole room box, floor to ceiling, in a %s view', (_, size) => {
    const camera = cameraFor(ROOM, size)

    for (const corner of corners(ROOM)) {
      const ndc = project(camera, corner)
      expect(Math.abs(ndc.x)).toBeLessThan(1)
      expect(Math.abs(ndc.y)).toBeLessThan(1)
      expect(Math.abs(ndc.z)).toBeLessThan(1)
    }
  })

  it('looks from behind the seats toward the front wall, from above, with +x on the right', () => {
    const camera = cameraFor(ROOM, { width: 800, height: 600 })

    const frontWall = project(camera, { x: 0, y: 0, z: 0 })
    const backWall = project(camera, { x: 0, y: ROOM.length, z: 0 })
    // Farther away (deeper) and higher up the screen: seen from the back.
    expect(frontWall.z).toBeGreaterThan(backWall.z)
    expect(frontWall.y).toBeGreaterThan(backWall.y)
    // Above the ceiling, looking down into the room.
    expect(camera.position.y).toBeGreaterThan(ROOM.height)
    const left = project(camera, { x: -1, y: 3, z: 0 })
    const right = project(camera, { x: 1, y: 3, z: 0 })
    expect(right.x).toBeGreaterThan(left.x)
  })

  it('orbits around the middle of the room box', () => {
    expect(orbitCamera(ROOM, { width: 800, height: 600 }).target).toEqual(
      toScenePosition({ x: 0, y: 3, z: 1.3 }),
    )
  })
})

describe('the orbit limits', () => {
  it('never goes below the floor and keeps the starting view inside the zoom range', () => {
    const size = { width: 800, height: 600 }
    const { position, target } = orbitCamera(ROOM, size)
    const start = new Vector3(...position).distanceTo(new Vector3(...target))

    const limits = orbitLimits(ROOM, size)

    expect(limits.maxPolarAngle).toBeLessThan(Math.PI / 2)
    expect(limits.minDistance).toBeGreaterThan(0)
    expect(limits.minDistance).toBeLessThan(start)
    expect(limits.maxDistance).toBeGreaterThan(start)
  })
})

describe('the room box', () => {
  it('outlines the room as 12 edges from the floor up to the ceiling', () => {
    const edges = roomBoxEdges(ROOM)

    expect(edges).toHaveLength(12)
    const heights = new Set(edges.flat().map(({ z }) => z))
    expect(heights).toEqual(new Set([0, 2.6]))
    const verticals = edges.filter(([from, to]) => from.z !== to.z)
    expect(verticals).toHaveLength(4)
    // Every edge runs along one axis, between two corners of the room.
    const cornerKeys = new Set(
      corners(ROOM).map(({ x, y, z }) => `${x},${y},${z}`),
    )
    for (const [from, to] of edges) {
      expect(cornerKeys).toContain(`${from.x},${from.y},${from.z}`)
      expect(cornerKeys).toContain(`${to.x},${to.y},${to.z}`)
      const changed = [from.x !== to.x, from.y !== to.y, from.z !== to.z]
      expect(changed.filter(Boolean)).toHaveLength(1)
    }
  })
})
