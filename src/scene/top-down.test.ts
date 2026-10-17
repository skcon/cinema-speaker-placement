import { Box3, Mesh, OrthographicCamera, PlaneGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  dragAnchors,
  MLP_ID,
  SEAT_ROW_ID,
  seatRowFootprint,
  type DragTarget,
  type FloorPoint,
  type Room,
  type RoomPoint,
} from '@/domain'
import { OVERHEAD_MARKER_RADIUS } from '@/scene/speakers'
import {
  distanceToShape,
  floorGrid,
  floorPlane,
  draggedTo,
  grabOffset,
  grabLength,
  grabRadius,
  pickGrab,
  toFloorPoint,
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

  it('maps a Three.js point back to the floor plan, for dragging', () => {
    expect(toFloorPoint(new Vector3(1, 3, 2))).toEqual({ x: 1, y: 2 })
  })

  it('keeps a dragged marker where it was grabbed, not centered on the pointer', () => {
    // Grabbed 0.1 m right of and 0.2 m behind its center.
    const offset = grabOffset({ x: 1, y: 2 }, { x: 1.1, y: 2.2 })

    const moved = draggedTo({ x: 2.1, y: 3.2 }, offset)
    expect(moved.x).toBeCloseTo(2, 9)
    expect(moved.y).toBeCloseTo(3, 9)
  })

  it('makes markers grabbable over at least a 44 px touch target', () => {
    // At 50 px per meter, 44 px is 0.88 m across.
    expect(grabRadius(0.2, 50)).toBeCloseTo(0.44, 9)
    // Zoomed in to 400 px per meter, the marker itself is larger.
    expect(grabRadius(0.2, 400)).toBe(0.2)
  })

  it('makes a long, thin marker grabbable over at least a 44 px touch target across', () => {
    // The screen's 0.08 m bar at 50 px per meter: 44 px is 0.88 m.
    expect(grabLength(0.08, 50)).toBeCloseTo(0.88, 9)
    expect(grabLength(1.44, 50)).toBe(1.44)
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

describe('distanceToShape', () => {
  it('is 0 on or inside a round marker, and the gap to its edge outside it', () => {
    const disc = { center: { x: 1, y: 2 }, radius: 0.2 }
    expect(distanceToShape(disc, { x: 1.1, y: 2 })).toBe(0)
    expect(distanceToShape(disc, { x: 1.2, y: 2 })).toBe(0)
    expect(distanceToShape(disc, { x: 1, y: 2.5 })).toBeCloseTo(0.3, 9)
  })

  it('is 0 on or inside a rectangle, and the gap to its nearest edge or corner outside it', () => {
    const box = { center: { x: 0, y: 0 }, width: 2, depth: 1 }
    expect(distanceToShape(box, { x: 0.9, y: -0.4 })).toBe(0)
    expect(distanceToShape(box, { x: 1, y: 0.5 })).toBe(0)
    expect(distanceToShape(box, { x: 1.3, y: 0 })).toBeCloseTo(0.3, 9)
    expect(distanceToShape(box, { x: 0, y: -0.9 })).toBeCloseTo(0.4, 9)
    // Off the corner (1, 0.5) by 0.3 and 0.4.
    expect(distanceToShape(box, { x: 1.3, y: 0.9 })).toBeCloseTo(0.5, 9)
  })
})

describe('pickGrab', () => {
  // The default room (5.1.2) at 56 px per meter, a phone-sized view: the
  // overheads' grab discs reach well past their markers, onto the couch.
  const config = DEFAULT_CONFIG
  const anchors = dragAnchors(config)
  const anchor = (target: DragTarget): FloorPoint => {
    const at = anchors.get(target)
    if (!at) throw new Error(`${target} has no anchor`)
    return at
  }
  const mlp = anchor(MLP_ID)
  const rtm = anchor('Rtm')
  const zoom = 56
  const couch = seatRowFootprint(
    config.room,
    { ...mlp, z: 0 },
    config.roomObjects.seatRow,
  )
  // In hit order, as the top-down view stacks the grab areas: item discs
  // over room objects' rectangles.
  const under = [
    { target: 'Rtm', shape: { center: rtm, radius: OVERHEAD_MARKER_RADIUS } },
    { target: MLP_ID, shape: { center: mlp, radius: 0.18 } },
    { target: SEAT_ROW_ID, shape: couch },
  ]
  const touchReach = (center: FloorPoint, radius: number, point: FloorPoint) =>
    Math.hypot(point.x - center.x, point.y - center.y) <=
    grabRadius(radius, zoom)

  it('picks the couch for a press on it beside the MLP, under an overhead grab disc but off its marker (#91)', () => {
    const pressed = { x: rtm.x - OVERHEAD_MARKER_RADIUS - 0.1, y: rtm.y }
    // The overlap the bug came from: the press is on the couch and inside
    // the overhead's grab disc, but not on its drawn marker.
    expect(distanceToShape(couch, pressed)).toBe(0)
    expect(touchReach(rtm, OVERHEAD_MARKER_RADIUS, pressed)).toBe(true)

    expect(pickGrab(pressed, under)).toBe(SEAT_ROW_ID)
    // Nearer the MLP, where a zoomed-out view's touch targets of the MLP
    // and the overhead both reach, but off both markers.
    expect(pickGrab({ x: mlp.x + 0.45, y: rtm.y }, under)).toBe(SEAT_ROW_ID)
  })

  it('picks the overhead for a press on its marker, even where it overlaps the couch', () => {
    expect(pickGrab(rtm, under)).toBe('Rtm')

    // Dragged in over the couch's end, its marker drawn over the couch.
    const over = { x: couch.center.x + couch.width / 2 - 0.1, y: rtm.y }
    const overCouch = [
      {
        target: 'Rtm',
        shape: { center: over, radius: OVERHEAD_MARKER_RADIUS },
      },
      ...under.slice(1),
    ]
    expect(distanceToShape(couch, over)).toBe(0)
    expect(pickGrab(over, overCouch)).toBe('Rtm')
  })

  it('picks the MLP for a press on its marker on the couch', () => {
    expect(pickGrab({ x: mlp.x + 0.1, y: mlp.y }, under)).toBe(MLP_ID)
  })

  it('picks the nearest marker for a press only inside touch targets', () => {
    // Beside the couch, 0.1 m right of the overhead marker's edge.
    const pressed = { x: rtm.x + OVERHEAD_MARKER_RADIUS + 0.1, y: rtm.y }
    expect(pickGrab(pressed, under)).toBe('Rtm')
  })

  it('picks nothing when nothing is under the press', () => {
    expect(pickGrab({ x: 0, y: 0 }, [])).toBeNull()
  })
})
