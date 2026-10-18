import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { DEFAULT_CONFIG, type Config } from './config'
import {
  dragAnchors,
  pressSelects,
  withDragged,
  type DragTarget,
} from './drag-targets'
import { newFurnitureBox } from './furniture'
import type { PlaceableId } from './manual-positions'
import { newOpening } from './openings'
import { positionOf } from './placements'
import { DEFAULT_ROOM, type FloorPoint } from './room'
import {
  DEFAULT_ROOM_OBJECTS,
  roomObjectAt,
  SCREEN_ID,
  SEAT_ROW_ID,
  type RoomObjects,
} from './room-objects'
import { defaultScreen } from './screen'

/** The default config with `objects` as its room objects. */
function configWith(objects: Partial<RoomObjects>): Config {
  return {
    ...DEFAULT_CONFIG,
    roomObjects: { ...DEFAULT_ROOM_OBJECTS, ...objects },
  }
}

/**
 * The default room (5.1.2, one subwoofer) with one of every room object: a
 * TV, a cabinet, and a door on the back wall and a window on the right.
 */
const FURNISHED = configWith({
  screen: defaultScreen(DEFAULT_ROOM),
  furniture: [newFurnitureBox(DEFAULT_ROOM, 'cabinet')],
  openings: [
    newOpening(DEFAULT_ROOM, 'door'),
    newOpening(DEFAULT_ROOM, 'window'),
  ],
})

/**
 * A whole drag of `target`, as the room view does it: the pointer presses
 * `grabbedAt` from the target's anchor, then moves by `by`, and the target
 * keeps where it was grabbed (its anchor goes to the pointer plus the grab
 * offset). Gives the config after the drag.
 */
function drag(
  config: Config,
  target: DragTarget,
  by: FloorPoint,
  grabbedAt: FloorPoint = { x: 0.07, y: -0.04 },
): Config {
  const anchor = dragAnchors(config, analyzeRoom(config)).get(target)
  if (!anchor) throw new Error(`${target} has no anchor`)
  const pressed = { x: anchor.x + grabbedAt.x, y: anchor.y + grabbedAt.y }
  const offset = { x: anchor.x - pressed.x, y: anchor.y - pressed.y }
  const pointer = { x: pressed.x + by.x, y: pressed.y + by.y }
  return withDragged(config, target, {
    x: pointer.x + offset.x,
    y: pointer.y + offset.y,
  })
}

describe('drag targets', () => {
  it('are every item of the layout, then every room object the Room has, each with an anchor on the floor plan', () => {
    expect([
      ...dragAnchors(DEFAULT_CONFIG, analyzeRoom(DEFAULT_CONFIG)).keys(),
    ]).toEqual([
      'L',
      'C',
      'R',
      'Ls',
      'Rs',
      'Ltm',
      'Rtm',
      'Sub1',
      'MLP',
      SEAT_ROW_ID,
    ])
    const anchors = dragAnchors(FURNISHED, analyzeRoom(FURNISHED))
    expect([...anchors.keys()].slice(-5)).toEqual([
      SEAT_ROW_ID,
      SCREEN_ID,
      'furniture-1',
      'opening-1',
      'opening-2',
    ])
    for (const anchor of anchors.values()) {
      expect(Number.isFinite(anchor.x) && Number.isFinite(anchor.y)).toBe(true)
    }
  })

  it('anchor an item at its position and the seat row at the MLP', () => {
    const anchors = dragAnchors(FURNISHED, analyzeRoom(FURNISHED))
    const onFloor = (id: PlaceableId) => {
      const position = positionOf(FURNISHED, id)
      return { x: position?.x, y: position?.y }
    }

    expect(anchors.get('R')).toEqual(onFloor('R'))
    expect(anchors.get('Ltm')).toEqual(onFloor('Ltm'))
    expect(anchors.get('Sub1')).toEqual(onFloor('Sub1'))
    expect(anchors.get('MLP')).toEqual(onFloor('MLP'))
    expect(anchors.get(SEAT_ROW_ID)).toEqual(onFloor('MLP'))
  })

  it('anchor a room object at its middle', () => {
    const anchors = dragAnchors(FURNISHED, analyzeRoom(FURNISHED))
    const { screen, furniture } = FURNISHED.roomObjects

    expect(anchors.get(SCREEN_ID)).toEqual({ x: screen?.x, y: 0 })
    expect(anchors.get('furniture-1')).toEqual({
      x: furniture[0]?.x,
      y: furniture[0]?.y,
    })
    // The door is in the middle of the back wall, the window of the right.
    expect(anchors.get('opening-1')).toEqual({ x: 0, y: DEFAULT_ROOM.length })
    expect(anchors.get('opening-2')).toEqual({
      x: DEFAULT_ROOM.width / 2,
      y: DEFAULT_ROOM.length / 2,
    })
  })
})

describe('a whole drag', () => {
  it('moves a speaker by as much as the pointer moved, making it manual', () => {
    const before = positionOf(FURNISHED, 'R')!
    const after = drag(FURNISHED, 'R', { x: -0.3, y: 0.2 })

    expect(after.manualPositions.R?.x).toBeCloseTo(before.x - 0.3, 9)
    expect(after.manualPositions.R?.y).toBeCloseTo(before.y + 0.2, 9)
    expect(after.manualPositions.R?.z).toBe(before.z)
  })

  it('moves an overhead speaker on the ceiling', () => {
    const before = positionOf(FURNISHED, 'Ltm')!
    const after = drag(FURNISHED, 'Ltm', { x: 0.25, y: 0.5 })

    expect(after.manualPositions.Ltm?.x).toBeCloseTo(before.x + 0.25, 9)
    expect(after.manualPositions.Ltm?.y).toBeCloseTo(before.y + 0.5, 9)
    expect(after.manualPositions.Ltm?.z).toBe(before.z)
  })

  it('moves a subwoofer', () => {
    const before = positionOf(FURNISHED, 'Sub1')!
    const after = drag(FURNISHED, 'Sub1', { x: 1, y: 0.5 })

    expect(after.manualPositions.Sub1?.x).toBeCloseTo(before.x + 1, 9)
    expect(after.manualPositions.Sub1?.y).toBeCloseTo(before.y + 0.5, 9)
  })

  it('moves the MLP, and the seat row with it', () => {
    const before = positionOf(FURNISHED, 'MLP')!
    const after = drag(FURNISHED, 'MLP', { x: 0.2, y: -0.4 })

    expect(after.manualPositions.MLP?.x).toBeCloseTo(before.x + 0.2, 9)
    expect(after.manualPositions.MLP?.y).toBeCloseTo(before.y - 0.4, 9)
    expect(dragAnchors(after, analyzeRoom(after)).get(SEAT_ROW_ID)).toEqual({
      x: after.manualPositions.MLP?.x,
      y: after.manualPositions.MLP?.y,
    })
  })

  it('moves the MLP by the seat row, by as much as the pointer moved: it does not jump', () => {
    const before = positionOf(FURNISHED, 'MLP')!
    // Grabbed near the front of the couch, well away from the MLP.
    const after = drag(
      FURNISHED,
      SEAT_ROW_ID,
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: -0.5 },
    )

    expect(after.manualPositions.MLP?.x).toBeCloseTo(before.x + 0.4, 9)
    expect(after.manualPositions.MLP?.y).toBeCloseTo(before.y + 0.3, 9)
    expect(after.manualPositions.MLP?.z).toBe(before.z)
    expect(after.roomObjects).toBe(FURNISHED.roomObjects)
  })

  it('keeps the MLP inside its wall clearances when the seat row is dragged into a wall', () => {
    const after = drag(FURNISHED, SEAT_ROW_ID, { x: 0, y: 9 })

    expect(after.manualPositions.MLP?.y).toBeLessThan(DEFAULT_ROOM.length)
  })

  it('changes nothing when the seat row is dragged back where it was', () => {
    const moved = drag(FURNISHED, SEAT_ROW_ID, { x: 0.4, y: 0.3 })

    expect(drag(moved, SEAT_ROW_ID, { x: 0, y: 0 })).toBe(moved)
  })

  it('slides the screen along the front wall: only across counts', () => {
    const before = FURNISHED.roomObjects.screen!
    const after = drag(FURNISHED, SCREEN_ID, { x: -0.5, y: 1.5 })

    expect(after.roomObjects.screen?.x).toBeCloseTo(before.x - 0.5, 9)
    expect(after.roomObjects.screen).toEqual({
      ...before,
      x: after.roomObjects.screen?.x,
    })
    expect(after.manualPositions).toEqual({})
  })

  it('moves a furniture box by its middle', () => {
    const before = roomObjectAt(FURNISHED.roomObjects, 'furniture-1')!
    const after = drag(FURNISHED, 'furniture-1', { x: 0.5, y: 1.2 })
    const box = roomObjectAt(after.roomObjects, 'furniture-1')

    expect(box?.x).toBeCloseTo(before.x + 0.5, 9)
    expect(box?.y).toBeCloseTo(before.y + 1.2, 9)
  })

  it('slides an opening along its own wall', () => {
    const door = roomObjectAt(FURNISHED.roomObjects, 'opening-1')!
    const window = roomObjectAt(FURNISHED.roomObjects, 'opening-2')!
    // The door is on the back wall: across counts. The window is on the
    // right wall: front to back counts.
    const afterDoor = drag(FURNISHED, 'opening-1', { x: 0.6, y: -1 })
    const afterWindow = drag(FURNISHED, 'opening-2', { x: -1, y: 0.8 })

    expect(
      roomObjectAt(afterDoor.roomObjects, 'opening-1')?.position,
    ).toBeCloseTo(door.position + 0.6, 9)
    expect(
      roomObjectAt(afterWindow.roomObjects, 'opening-2')?.position,
    ).toBeCloseTo(window.position + 0.8, 9)
    expect(roomObjectAt(afterDoor.roomObjects, 'opening-1')?.wall).toBe('back')
  })

  it('changes nothing for a room object the Room does not have', () => {
    expect(withDragged(DEFAULT_CONFIG, SCREEN_ID, { x: 1, y: 0 })).toBe(
      DEFAULT_CONFIG,
    )
    expect(withDragged(FURNISHED, 'furniture-2', { x: 1, y: 1 })).toBe(
      FURNISHED,
    )
  })

  it('changes nothing for an item the layout does not have', () => {
    expect(withDragged(DEFAULT_CONFIG, 'Lrs', { x: 1, y: 1 })).toBe(
      DEFAULT_CONFIG,
    )
  })
})

describe('pressing a drag target', () => {
  it('selects an item', () => {
    expect(pressSelects('R')).toBe('R')
    expect(pressSelects('Ltm')).toBe('Ltm')
    expect(pressSelects('Sub1')).toBe('Sub1')
    expect(pressSelects('MLP')).toBe('MLP')
  })

  it('selects nothing for a room object', () => {
    expect(pressSelects(SEAT_ROW_ID)).toBeNull()
    expect(pressSelects(SCREEN_ID)).toBeNull()
    expect(pressSelects('furniture-1')).toBeNull()
    expect(pressSelects('opening-2')).toBeNull()
  })
})
