import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ROOM,
  type FurnitureBox,
  type Opening,
  type RoomScreen,
} from '@/domain'
import {
  describeFurniture,
  describeOpenings,
  doorSwing,
  OPENING_MARK_DEPTH,
  openingMark,
  openingPanel,
  describeScreen,
  furnitureBlock,
  furniturePlan,
  FURNITURE_FRONT_STRIP,
  describeSeatRow,
  SCREEN_BAR_DEPTH,
  screenBar,
  screenPanel,
} from '@/scene/room-objects'

const TV: RoomScreen = {
  kind: 'tv',
  width: 1.44,
  height: 0.81,
  bottomEdge: 0.93,
  x: 0,
  standoff: null,
}

const AT_SCREEN: RoomScreen = {
  kind: 'projection',
  width: 2.66,
  height: 1.5,
  bottomEdge: 0.6,
  x: -0.5,
  standoff: 0.75,
}

describe('the screen from above', () => {
  it('is a bar its width wide, against the inside of the front wall', () => {
    expect(screenBar(TV)).toEqual({
      center: { x: 0, y: SCREEN_BAR_DEPTH / 2, z: 0 },
      width: 1.44,
      depth: SCREEN_BAR_DEPTH,
    })
  })

  it('stands an acoustically transparent screen off the wall', () => {
    expect(screenBar(AT_SCREEN).center).toEqual({
      x: -0.5,
      y: 0.75 + SCREEN_BAR_DEPTH / 2,
      z: 0,
    })
  })
})

describe('the screen in 3D', () => {
  it('is a panel facing into the room, from its bottom edge up', () => {
    const panel = screenPanel(TV)

    // Three.js has y up: room (x, y, z) -> (x, z, y).
    expect(panel.position[0]).toBe(0)
    expect(panel.position[1]).toBeCloseTo(0.93 + 0.81 / 2, 9)
    expect(panel.position[2]).toBeGreaterThan(0)
    expect(panel.position[2]).toBeLessThan(0.05)
    expect(panel.size).toEqual([1.44, 0.81])
  })

  it('stands an acoustically transparent screen off the wall', () => {
    expect(screenPanel(AT_SCREEN).position[2]).toBeCloseTo(0.75, 1)
  })
})

describe('the screen in words', () => {
  it('names a TV, its size, its height and that it is centred', () => {
    expect(describeScreen(TV, 'metric')).toBe(
      'A TV on the front wall, 1.44 m wide and 0.81 m high, its bottom edge 0.93 m above the floor, centred.',
    )
  })

  it('says how far an off-centre, acoustically transparent screen is moved and stands off', () => {
    expect(describeScreen(AT_SCREEN, 'metric')).toBe(
      'An acoustically transparent projection screen 0.75 m in front of the front wall, 2.66 m wide and 1.5 m high, its bottom edge 0.6 m above the floor, its middle 0.5 m left of centre.',
    )
  })

  it('writes the lengths in the chosen units', () => {
    expect(describeScreen({ ...TV, x: 0.3048 }, 'imperial')).toBe(
      'A TV on the front wall, 4 ft 8.7 in wide and 2 ft 7.9 in high, its bottom edge 3 ft 0.6 in above the floor, its middle 1 ft 0 in right of centre.',
    )
  })
})

describe('the seat row in words', () => {
  it('gives its size and where the MLP sits on it', () => {
    expect(describeSeatRow({ width: 2, depth: 0.9 }, 'metric')).toBe(
      'A seat row 2 m wide and 0.9 m deep, with the MLP 0.35 m in front of its back; dragging it moves the MLP.',
    )
  })

  it('writes the lengths in the chosen units', () => {
    expect(describeSeatRow({ width: 3.6576, depth: 0.9144 }, 'imperial')).toBe(
      'A seat row 12 ft 0 in wide and 3 ft 0 in deep, with the MLP 1 ft 1.8 in in front of its back; dragging it moves the MLP.',
    )
  })
})

/** A 1.6 x 0.45 x 0.5 m cabinet in the middle of a room. */
const CABINET: FurnitureBox = {
  name: 'Cabinet',
  width: 1.6,
  depth: 0.45,
  height: 0.5,
  x: 1,
  y: 3,
  rotation: 0,
}

describe('a furniture box from above', () => {
  it('is a rectangle as it is turned, with a strip along its front', () => {
    const plan = furniturePlan(CABINET)

    expect(plan.center).toEqual({ x: 1, y: 3, z: 0 })
    expect(plan.size[0]).toBeCloseTo(1.6, 9)
    expect(plan.size[1]).toBeCloseTo(0.45, 9)
    // Unturned, its front faces the back wall: the strip is on its back
    // side, from the front wall's view (room +y).
    expect(plan.front.size[0]).toBeCloseTo(1.6, 9)
    expect(plan.front.size[1]).toBe(FURNITURE_FRONT_STRIP)
    expect(plan.front.center.y).toBeCloseTo(
      3.225 - FURNITURE_FRONT_STRIP / 2,
      9,
    )
  })

  it.each([
    [90, 'x', 1 - 0.225 + FURNITURE_FRONT_STRIP / 2],
    [180, 'y', 3 - 0.225 + FURNITURE_FRONT_STRIP / 2],
    [270, 'x', 1 + 0.225 - FURNITURE_FRONT_STRIP / 2],
  ] as const)(
    'turned %i°, has its front strip along its side on %s = %d',
    (rotation, axis, at) => {
      const plan = furniturePlan({ ...CABINET, rotation })

      expect(plan.front.center[axis]).toBeCloseTo(at, 9)
    },
  )

  it('keeps the strip inside a small box', () => {
    const plan = furniturePlan({ ...CABINET, width: 0.1, depth: 0.1 })

    expect(plan.front.size[1]).toBeCloseTo(0.1 / 3, 9)
  })
})

describe('a furniture box in 3D', () => {
  it('stands on the floor, its height up', () => {
    const block = furnitureBlock({ ...CABINET, rotation: 90 })

    // Three.js has y up: room (x, y, z) -> (x, z, y).
    expect(block.position).toEqual([1, 0.25, 3])
    expect(block.size[0]).toBeCloseTo(0.45, 9)
    expect(block.size[1]).toBe(0.5)
    expect(block.size[2]).toBeCloseTo(1.6, 9)
  })
})

describe('furniture in words', () => {
  it('names each box by its name and number, with its size', () => {
    expect(
      describeFurniture(
        [CABINET, { ...CABINET, name: 'Shelf', height: 1.8288 }],
        'imperial',
      ),
    ).toBe(
      'Furniture: Cabinet (box 1), 5 ft 3 in wide, 1 ft 5.7 in deep and 1 ft 7.7 in high; Shelf (box 2), 5 ft 3 in wide, 1 ft 5.7 in deep and 6 ft 0 in high.',
    )
  })

  it('is empty without furniture', () => {
    expect(describeFurniture([], 'metric')).toBe('')
  })
})

/** A 0.9 m door in the middle of the default room's back wall. */
const DOOR: Opening = { kind: 'door', wall: 'back', position: 2.25, width: 0.9 }

/** A 1.2 m window on the default room's left wall, 1 m to 2.2 m back. */
const WINDOW: Opening = {
  kind: 'window',
  wall: 'left',
  position: 1.6,
  width: 1.2,
  sill: 0.9,
  height: 1.2,
}

describe('openings from above', () => {
  it('are a mark along the inside of their wall, as wide as they are', () => {
    const door = openingMark(DEFAULT_ROOM, DOOR)
    expect(door.center.x).toBeCloseTo(0, 12)
    expect(door.center.y).toBeCloseTo(6 - OPENING_MARK_DEPTH / 2, 12)
    expect(door.size).toEqual([0.9, OPENING_MARK_DEPTH])

    const window = openingMark(DEFAULT_ROOM, WINDOW)
    expect(window.center.x).toBeCloseTo(-2.25 + OPENING_MARK_DEPTH / 2, 12)
    expect(window.center.y).toBeCloseTo(1.6, 12)
    expect(window.size).toEqual([OPENING_MARK_DEPTH, 1.2])
  })

  it('show where a door swings: a square as deep as the door is wide', () => {
    const swing = doorSwing(DEFAULT_ROOM, DOOR)
    expect(swing.center.x).toBeCloseTo(0, 12)
    expect(swing.center.y).toBeCloseTo(5.55, 12)
    expect(swing.size).toEqual([0.9, 0.9])
  })
})

describe('openings in 3D', () => {
  it('are panels on their wall, a door from the floor to 2 m', () => {
    const { position, size, rotation } = openingPanel(DEFAULT_ROOM, DOOR)
    expect(position[0]).toBeCloseTo(0, 12)
    expect(position[1]).toBeCloseTo(1, 12)
    expect(size).toEqual([0.9, 2])
    expect(rotation).toEqual([0, Math.PI, 0])
  })

  it('are panels on their wall, a window from its sill to its top, turned to face the room', () => {
    const { position, size, rotation } = openingPanel(DEFAULT_ROOM, WINDOW)
    expect(position[1]).toBeCloseTo(1.5, 12)
    expect(position[2]).toBeCloseTo(1.6, 12)
    expect(size[0]).toBe(1.2)
    expect(size[1]).toBeCloseTo(1.2, 12)
    expect(rotation).toEqual([0, Math.PI / 2, 0])
  })

  it.each([
    ['front', [0.75 - 2.25, 1, 0.01], 0],
    ['back', [0.75 - 2.25, 1, 6 - 0.01], Math.PI],
    ['left', [-2.25 + 0.01, 1, 0.75], Math.PI / 2],
    ['right', [2.25 - 0.01, 1, 0.75], -Math.PI / 2],
  ] as const)(
    'stand just inside the %s wall, turned to face into the room',
    (wall, at, turn) => {
      const door: Opening = { ...DOOR, wall, position: 0.75 }
      const { position, rotation } = openingPanel(DEFAULT_ROOM, door)
      position.forEach((value, axis) => {
        expect(value).toBeCloseTo(at[axis] ?? NaN, 12)
      })
      expect(rotation).toEqual([0, turn, 0])
    },
  )
})

describe('opening marks on every wall', () => {
  it.each([
    [
      'front',
      { x: -1.5, y: OPENING_MARK_DEPTH / 2 },
      [0.9, OPENING_MARK_DEPTH],
    ],
    [
      'back',
      { x: -1.5, y: 6 - OPENING_MARK_DEPTH / 2 },
      [0.9, OPENING_MARK_DEPTH],
    ],
    [
      'left',
      { x: -2.25 + OPENING_MARK_DEPTH / 2, y: 0.75 },
      [OPENING_MARK_DEPTH, 0.9],
    ],
    [
      'right',
      { x: 2.25 - OPENING_MARK_DEPTH / 2, y: 0.75 },
      [OPENING_MARK_DEPTH, 0.9],
    ],
  ] as const)('lie along the inside of the %s wall', (wall, center, size) => {
    const mark = openingMark(DEFAULT_ROOM, { ...DOOR, wall, position: 0.75 })
    expect(mark.center.x).toBeCloseTo(center.x, 12)
    expect(mark.center.y).toBeCloseTo(center.y, 12)
    expect(mark.center.z).toBe(0)
    expect(mark.size).toEqual(size)
  })
})

describe('openings in words', () => {
  it('name each, its wall, its size and where it is along the wall', () => {
    expect(describeOpenings([DOOR, WINDOW], 'metric')).toBe(
      'Doors and windows: Door (opening 1) on the back wall, 0.9 m wide, ' +
        '1.8 m from the left wall; Window (opening 2) on the left wall, ' +
        '1.2 m wide and 1.2 m high, its sill 0.9 m up, 1 m from the front wall.',
    )
    expect(describeOpenings([], 'metric')).toBe('')
  })
})
