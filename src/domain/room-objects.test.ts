import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type Config } from './config'
import {
  furnitureTurned,
  newFurnitureBox,
  withFurnitureDimension,
  withFurnitureName,
} from './furniture'
import { newOpening, withOpeningWall } from './openings'
import { DEFAULT_ROOM, type Room } from './room'
import {
  areValidRoomObjects,
  DEFAULT_ROOM_OBJECTS,
  isRoomObjectId,
  keepRoomObjectsInRoom,
  MAX_FURNITURE,
  MAX_OPENINGS,
  roomObjectAt,
  roomObjectId,
  roomObjectKind,
  SCREEN_ID,
  SEAT_ROW_ID,
  withRoomObjectAdded,
  withRoomObjectEdited,
  withRoomObjectMoved,
  withRoomObjectRemoved,
  type RoomObjects,
} from './room-objects'
import { defaultScreen, withScreenKind } from './screen'
import { DEFAULT_SEAT_ROW, withSeatRowDimension } from './seat-row'

/** The default config with `objects` as its room objects. */
function configWith(objects: Partial<RoomObjects>): Config {
  return {
    ...DEFAULT_CONFIG,
    roomObjects: { ...DEFAULT_ROOM_OBJECTS, ...objects },
  }
}

const CABINET = newFurnitureBox(DEFAULT_ROOM, 'cabinet')
const SHELF = newFurnitureBox(DEFAULT_ROOM, 'shelf')

/** The default 65 in TV, centred on the default room's front wall. */
const TV = defaultScreen(DEFAULT_ROOM)

/** The default door, in the middle of the default room's back wall. */
const DOOR = newOpening(DEFAULT_ROOM, 'door')

/** The default window, in the middle of the default room's right wall. */
const WINDOW = newOpening(DEFAULT_ROOM, 'window')

/** The default room with a cabinet and a shelf against the front wall. */
const FURNISHED = configWith({ furniture: [CABINET, SHELF] })

const WITH_TV = configWith({ screen: TV })

/** The default room with the default door and window. */
const WITH_OPENINGS = configWith({ openings: [DOOR, WINDOW] })

function objects(config: Config) {
  return config.roomObjects
}

describe('room objects', () => {
  it('start as the default seat row and nothing else, and that is valid', () => {
    expect(DEFAULT_ROOM_OBJECTS).toEqual({
      seatRow: DEFAULT_SEAT_ROW,
      screen: null,
      furniture: [],
      openings: [],
    })
    expect(areValidRoomObjects(DEFAULT_ROOM, DEFAULT_ROOM_OBJECTS)).toBe(true)
  })
})

describe('room object ids', () => {
  it('name the seat row and the screen by their kind', () => {
    expect(isRoomObjectId(SEAT_ROW_ID)).toBe(true)
    expect(isRoomObjectId(SCREEN_ID)).toBe(true)
    expect(roomObjectKind(SEAT_ROW_ID)).toBe('seatRow')
    expect(roomObjectKind(SCREEN_ID)).toBe('screen')
  })

  it('name furniture boxes and openings by their place in their list, from 1', () => {
    expect(roomObjectId('furniture', 0)).toBe('furniture-1')
    expect(roomObjectId('opening', 11)).toBe('opening-12')
    expect(roomObjectKind('furniture-8')).toBe('furniture')
    expect(roomObjectKind('opening-3')).toBe('opening')
  })

  it('are not the ids of speakers, subwoofers, the MLP or anything else', () => {
    expect(roomObjectKind('MLP')).toBeNull()
    for (const id of [
      'MLP',
      'L',
      'SW1',
      'furniture',
      'furniture-0',
      'furniture-01',
      'opening-',
      'opening-1x',
      'Screen',
    ]) {
      expect(isRoomObjectId(id)).toBe(false)
    }
  })

  it('find the object they name, and nothing for one the Room does not have', () => {
    const { roomObjects } = configWith({
      screen: TV,
      furniture: [CABINET, SHELF],
      openings: [DOOR],
    })

    expect(roomObjectAt(roomObjects, SEAT_ROW_ID)).toBe(roomObjects.seatRow)
    expect(roomObjectAt(roomObjects, SCREEN_ID)).toBe(TV)
    expect(roomObjectAt(roomObjects, 'furniture-2')).toBe(SHELF)
    expect(roomObjectAt(roomObjects, 'opening-1')).toBe(DOOR)
    expect(roomObjectAt(roomObjects, 'furniture-3')).toBeNull()
    expect(roomObjectAt(roomObjects, 'opening-2')).toBeNull()
    expect(roomObjectAt(DEFAULT_ROOM_OBJECTS, SCREEN_ID)).toBeNull()
  })
})

describe('adding a room object', () => {
  it('adds the default TV centred on the front wall, and only once', () => {
    const added = withRoomObjectAdded(DEFAULT_CONFIG, { kind: 'screen' })

    expect(objects(added).screen).toEqual(TV)
    expect(withRoomObjectAdded(added, { kind: 'screen' })).toBe(added)
  })

  it('adds a furniture box from a preset at the end of the list, keeping the rest of the config', () => {
    const added = withRoomObjectAdded(FURNISHED, {
      kind: 'furniture',
      preset: 'table',
    })

    expect(objects(added).furniture).toEqual([
      CABINET,
      SHELF,
      newFurnitureBox(DEFAULT_ROOM, 'table'),
    ])
    expect({ ...added, roomObjects: FURNISHED.roomObjects }).toEqual(FURNISHED)
  })

  it(`stops at ${MAX_FURNITURE} furniture boxes`, () => {
    expect(MAX_FURNITURE).toBe(8)
    const full = configWith({
      furniture: Array.from({ length: MAX_FURNITURE }, () => CABINET),
    })

    expect(
      withRoomObjectAdded(full, { kind: 'furniture', preset: 'shelf' }),
    ).toBe(full)
  })

  it('adds a door on the back wall and a window on the right wall', () => {
    const door = withRoomObjectAdded(DEFAULT_CONFIG, {
      kind: 'opening',
      preset: 'door',
    })
    const both = withRoomObjectAdded(door, {
      kind: 'opening',
      preset: 'window',
    })

    expect(objects(both).openings).toEqual([DOOR, WINDOW])
  })

  it(`stops at ${MAX_OPENINGS} openings`, () => {
    expect(MAX_OPENINGS).toBe(6)
    const full = configWith({
      openings: Array.from({ length: MAX_OPENINGS }, () => WINDOW),
    })

    expect(withRoomObjectAdded(full, { kind: 'opening', preset: 'door' })).toBe(
      full,
    )
  })

  it('fits what it adds into a small room', () => {
    const small: Room = { length: 2, width: 1, height: 1.5 }
    const added = withRoomObjectAdded(
      { ...DEFAULT_CONFIG, room: small },
      { kind: 'furniture', preset: 'shelf' },
    )

    expect(objects(added).furniture[0]).toMatchObject({
      width: 0.8,
      height: 1.5,
    })
  })
})

describe('removing a room object', () => {
  it('moves the objects after it up a place, and so down an id', () => {
    const removed = withRoomObjectRemoved(FURNISHED, 'furniture-1')

    expect(objects(removed).furniture).toEqual([SHELF])
    expect(roomObjectAt(objects(removed), 'furniture-1')).toBe(SHELF)
    expect(
      objects(withRoomObjectRemoved(WITH_OPENINGS, 'opening-1')).openings,
    ).toEqual([WINDOW])
  })

  it('takes the screen away', () => {
    expect(objects(withRoomObjectRemoved(WITH_TV, SCREEN_ID)).screen).toBeNull()
  })

  it('changes nothing for an object the Room does not have, or the seat row', () => {
    expect(withRoomObjectRemoved(FURNISHED, 'furniture-3')).toBe(FURNISHED)
    expect(withRoomObjectRemoved(WITH_OPENINGS, 'opening-3')).toBe(
      WITH_OPENINGS,
    )
    expect(withRoomObjectRemoved(DEFAULT_CONFIG, SCREEN_ID)).toBe(
      DEFAULT_CONFIG,
    )
    expect(withRoomObjectRemoved(DEFAULT_CONFIG, SEAT_ROW_ID)).toBe(
      DEFAULT_CONFIG,
    )
  })
})

describe('editing a room object', () => {
  it('changes that object only', () => {
    const renamed = withRoomObjectEdited(FURNISHED, 'furniture-1', (_, box) =>
      withFurnitureName(box, 'TV bench'),
    )

    expect(objects(renamed).furniture.map(({ name }) => name)).toEqual([
      'TV bench',
      'Shelf',
    ])
    expect(objects(renamed).furniture[1]).toBe(SHELF)
  })

  it('gives the edit the Room', () => {
    const turned = withRoomObjectEdited(
      FURNISHED,
      'furniture-1',
      furnitureTurned,
    )
    const onWall = withRoomObjectEdited(
      WITH_OPENINGS,
      'opening-1',
      (room, door) => withOpeningWall(room, door, 'left'),
    )

    expect(objects(turned).furniture[0]).toMatchObject({ rotation: 90, y: 0.8 })
    expect(objects(onWall).openings[0]).toMatchObject({
      wall: 'left',
      position: 2.25,
    })
  })

  it('edits the seat row and the screen by their ids', () => {
    const wider = withRoomObjectEdited(DEFAULT_CONFIG, SEAT_ROW_ID, (_, row) =>
      withSeatRowDimension(row, 'width', 3),
    )
    const projection = withRoomObjectEdited(WITH_TV, SCREEN_ID, (_, screen) =>
      withScreenKind(screen, 'projection'),
    )

    expect(objects(wider).seatRow).toEqual({ width: 3, depth: 0.9 })
    expect(objects(projection).screen).toEqual({ ...TV, kind: 'projection' })
  })

  it('comes back as it was when the edit rejects the change or keeps the object', () => {
    expect(withRoomObjectEdited(FURNISHED, 'furniture-1', () => null)).toBe(
      FURNISHED,
    )
    expect(
      withRoomObjectEdited(FURNISHED, 'furniture-1', (_, box) => box),
    ).toBe(FURNISHED)
    expect(
      withRoomObjectEdited(DEFAULT_CONFIG, SEAT_ROW_ID, (_, row) =>
        withSeatRowDimension(row, 'depth', 0.3),
      ),
    ).toBe(DEFAULT_CONFIG)
  })

  it('comes back as it was for an equal object: no empty change', () => {
    expect(
      withRoomObjectEdited(WITH_TV, SCREEN_ID, (_, screen) => ({ ...screen })),
    ).toBe(WITH_TV)
  })

  it('comes back as it was when the edited object would not fit the Room', () => {
    expect(
      withRoomObjectEdited(FURNISHED, 'furniture-1', (_, box) => ({
        ...box,
        x: 2,
      })),
    ).toBe(FURNISHED)
    expect(
      withRoomObjectEdited(WITH_OPENINGS, 'opening-1', (_, door) => ({
        ...door,
        position: 4.3,
      })),
    ).toBe(WITH_OPENINGS)
  })

  it('changes nothing for an object the Room does not have', () => {
    let called = false
    const edit = () => {
      called = true
      return null
    }

    expect(withRoomObjectEdited(DEFAULT_CONFIG, SCREEN_ID, edit)).toBe(
      DEFAULT_CONFIG,
    )
    expect(withRoomObjectEdited(FURNISHED, 'furniture-3', edit)).toBe(FURNISHED)
    expect(called).toBe(false)
  })

  it('takes a size within the limits of the box in this Room', () => {
    const resize = (meters: number) =>
      withRoomObjectEdited(FURNISHED, 'furniture-1', (room, box) =>
        withFurnitureDimension(room, box, 'width', meters),
      )

    expect(objects(resize(2)).furniture[0]?.width).toBe(2)
    expect(resize(9)).toBe(FURNISHED)
  })
})

describe('moving a room object', () => {
  it('drags the screen along the front wall only', () => {
    const moved = withRoomObjectMoved(WITH_TV, SCREEN_ID, { x: -0.8, y: 3 })

    expect(objects(moved).screen).toEqual({ ...TV, x: -0.8 })
  })

  it('drags a furniture box by its middle, stopping at the walls, and leaves the others', () => {
    const moved = withRoomObjectMoved(FURNISHED, 'furniture-2', { x: 3, y: 3 })

    // The 0.8 m shelf stops with its right side on the 4.5 m room's wall.
    expect(objects(moved).furniture[1]).toMatchObject({ x: 1.85, y: 3 })
    expect(objects(moved).furniture[0]).toBe(CABINET)
  })

  it('drags an opening along its own wall, stopping at a corner, and leaves the others', () => {
    const moved = withRoomObjectMoved(WITH_OPENINGS, 'opening-1', {
      x: 3,
      y: 1,
    })

    // The 0.9 m door stops with its edge in the back right corner.
    expect(objects(moved).openings).toEqual([
      { ...DOOR, position: 4.05 },
      WINDOW,
    ])
  })

  it('comes back as it was when the object is not there or stays put', () => {
    expect(withRoomObjectMoved(DEFAULT_CONFIG, SCREEN_ID, { x: 1, y: 0 })).toBe(
      DEFAULT_CONFIG,
    )
    expect(withRoomObjectMoved(WITH_TV, SCREEN_ID, { x: 0, y: 2 })).toBe(
      WITH_TV,
    )
    expect(withRoomObjectMoved(FURNISHED, 'furniture-3', { x: 1, y: 1 })).toBe(
      FURNISHED,
    )
    expect(
      withRoomObjectMoved(WITH_OPENINGS, 'opening-3', { x: 1, y: 1 }),
    ).toBe(WITH_OPENINGS)
  })

  it('leaves the seat row as it is: it stores no position', () => {
    expect(withRoomObjectMoved(WITH_TV, SEAT_ROW_ID, { x: 1, y: 3 })).toBe(
      WITH_TV,
    )
  })
})

describe('room objects in a resized room', () => {
  it('stay as they are when they fit', () => {
    const all = configWith({
      screen: TV,
      furniture: [CABINET, SHELF],
      openings: [DOOR, WINDOW],
    }).roomObjects

    expect(keepRoomObjectsInRoom({ ...DEFAULT_ROOM, width: 8 }, all)).toBe(all)
    expect(keepRoomObjectsInRoom(DEFAULT_ROOM, DEFAULT_ROOM_OBJECTS)).toBe(
      DEFAULT_ROOM_OBJECTS,
    )
  })

  it('keep the seat row size in a room narrower than it: it is drawn cut off at the walls', () => {
    const wide: RoomObjects = {
      ...DEFAULT_ROOM_OBJECTS,
      seatRow: { width: 6, depth: 0.9 },
    }

    expect(keepRoomObjectsInRoom({ ...DEFAULT_ROOM, width: 3 }, wide)).toBe(
      wide,
    )
  })

  it('shrink the screen with a room that gets narrower than it', () => {
    const wide: RoomObjects = {
      ...DEFAULT_ROOM_OBJECTS,
      screen: { ...TV, width: 4 },
    }

    expect(
      keepRoomObjectsInRoom({ ...DEFAULT_ROOM, width: 3 }, wide).screen,
    ).toMatchObject({ width: 3, x: 0 })
  })

  it('shrink furniture too big for the room, and keep the rest', () => {
    const low = { ...DEFAULT_ROOM, height: 1.5 }
    const kept = keepRoomObjectsInRoom(low, FURNISHED.roomObjects)

    expect(kept.furniture[0]).toBe(CABINET)
    expect(kept.furniture[1]).toMatchObject({ name: 'Shelf', height: 1.5 })
  })

  it('move and lower openings into a room too small for them, keeping the other objects', () => {
    const small = { length: 3, width: 2, height: 2 }
    const before = configWith({
      furniture: [],
      openings: [DOOR, WINDOW],
    }).roomObjects
    const kept = keepRoomObjectsInRoom(small, before)

    // The 0.9 m door into the back right corner of the 2 m back wall, the
    // window into the back of the 3 m right wall and down from the ceiling.
    expect(kept.openings[0]?.position).toBeCloseTo(1.55, 12)
    expect(kept.openings[1]).toMatchObject({ position: 2.4, sill: 0.8 })
    expect(kept.furniture).toBe(before.furniture)
    expect(kept.seatRow).toBe(before.seatRow)
    expect(areValidRoomObjects(small, kept)).toBe(true)
  })
})

describe('room object validity', () => {
  it('needs a screen that fits the room', () => {
    expect(areValidRoomObjects(DEFAULT_ROOM, WITH_TV.roomObjects)).toBe(true)
    expect(
      areValidRoomObjects(
        { ...DEFAULT_ROOM, height: 2 },
        { ...DEFAULT_ROOM_OBJECTS, screen: { ...TV, bottomEdge: 1.5 } },
      ),
    ).toBe(false)
  })

  it('needs a seat row inside its size limits', () => {
    expect(
      areValidRoomObjects(DEFAULT_ROOM, {
        ...DEFAULT_ROOM_OBJECTS,
        seatRow: { width: 3, depth: 1.6 },
      }),
    ).toBe(true)
    expect(
      areValidRoomObjects(DEFAULT_ROOM, {
        ...DEFAULT_ROOM_OBJECTS,
        seatRow: { width: 2, depth: 0.3 },
      }),
    ).toBe(false)
  })

  it(`needs at most ${MAX_FURNITURE} boxes, each inside the room`, () => {
    const boxes = (count: number): RoomObjects => ({
      ...DEFAULT_ROOM_OBJECTS,
      furniture: Array.from({ length: count }, () => CABINET),
    })

    expect(areValidRoomObjects(DEFAULT_ROOM, boxes(MAX_FURNITURE))).toBe(true)
    expect(areValidRoomObjects(DEFAULT_ROOM, boxes(MAX_FURNITURE + 1))).toBe(
      false,
    )
    expect(
      areValidRoomObjects(DEFAULT_ROOM, {
        ...DEFAULT_ROOM_OBJECTS,
        furniture: [{ ...CABINET, x: 2 }],
      }),
    ).toBe(false)
  })

  it(`needs at most ${MAX_OPENINGS} openings, each on its wall`, () => {
    const doors = (count: number): RoomObjects => ({
      ...DEFAULT_ROOM_OBJECTS,
      openings: Array.from({ length: count }, () => DOOR),
    })

    expect(areValidRoomObjects(DEFAULT_ROOM, doors(MAX_OPENINGS))).toBe(true)
    expect(areValidRoomObjects(DEFAULT_ROOM, doors(MAX_OPENINGS + 1))).toBe(
      false,
    )
    expect(
      areValidRoomObjects(DEFAULT_ROOM, {
        ...DEFAULT_ROOM_OBJECTS,
        openings: [{ ...DOOR, position: 4.3 }],
      }),
    ).toBe(false)
  })
})
