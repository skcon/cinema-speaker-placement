import { describe, expect, it } from 'vitest'
import {
  areValidRoomObjects,
  DEFAULT_ROOM_OBJECTS,
  isRoomObjectId,
  keepRoomObjectsInRoom,
  roomObjectsMoved,
  roundRoomObjectsForLink,
  SCREEN_ID,
  SEAT_ROW_ID,
  type RoomObjects,
} from './room-objects'
import { DEFAULT_ROOM } from './room'
import { defaultScreen } from './screen'
import { DEFAULT_SEAT_ROW } from './seat-row'

const WITH_TV: RoomObjects = {
  ...DEFAULT_ROOM_OBJECTS,
  screen: defaultScreen(DEFAULT_ROOM),
}

describe('room objects', () => {
  it('start as the default seat row and no screen, and that is valid', () => {
    expect(DEFAULT_ROOM_OBJECTS).toEqual({
      seatRow: DEFAULT_SEAT_ROW,
      screen: null,
    })
    expect(areValidRoomObjects(DEFAULT_ROOM, DEFAULT_ROOM_OBJECTS)).toBe(true)
  })

  it('are valid with a screen that fits the room, and not otherwise', () => {
    expect(areValidRoomObjects(DEFAULT_ROOM, WITH_TV)).toBe(true)
    expect(
      areValidRoomObjects(
        { ...DEFAULT_ROOM, height: 2 },
        {
          ...DEFAULT_ROOM_OBJECTS,
          screen: { ...defaultScreen(DEFAULT_ROOM), bottomEdge: 1.5 },
        },
      ),
    ).toBe(false)
  })

  it('are valid only with a seat row inside its size limits', () => {
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

  it('name the seat row and the screen by their ids, and nothing else', () => {
    expect(isRoomObjectId(SEAT_ROW_ID)).toBe(true)
    expect(isRoomObjectId(SCREEN_ID)).toBe(true)
    expect(isRoomObjectId('MLP')).toBe(false)
  })

  it('stay as they are when they fit a resized room', () => {
    expect(keepRoomObjectsInRoom({ ...DEFAULT_ROOM, width: 8 }, WITH_TV)).toBe(
      WITH_TV,
    )
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

  it('shrink with a room that gets narrower than the screen', () => {
    const wide: RoomObjects = {
      ...DEFAULT_ROOM_OBJECTS,
      screen: { ...defaultScreen(DEFAULT_ROOM), width: 4 },
    }

    expect(
      keepRoomObjectsInRoom({ ...DEFAULT_ROOM, width: 3 }, wide).screen,
    ).toMatchObject({ width: 3, x: 0 })
  })

  it('drag the screen along the front wall only', () => {
    expect(
      roomObjectsMoved(DEFAULT_ROOM, WITH_TV, SCREEN_ID, { x: -0.8, y: 3 })
        .screen,
    ).toMatchObject({ x: -0.8, standoff: null })
  })

  it('come back as they were when the dragged object is missing or stays put', () => {
    expect(
      roomObjectsMoved(DEFAULT_ROOM, DEFAULT_ROOM_OBJECTS, SCREEN_ID, {
        x: 1,
        y: 0,
      }),
    ).toBe(DEFAULT_ROOM_OBJECTS)
    expect(
      roomObjectsMoved(DEFAULT_ROOM, WITH_TV, SCREEN_ID, { x: 0, y: 2 }),
    ).toBe(WITH_TV)
  })

  it('leave a dragged seat row to the MLP: they store no position for it', () => {
    expect(
      roomObjectsMoved(DEFAULT_ROOM, WITH_TV, SEAT_ROW_ID, { x: 1, y: 3 }),
    ).toBe(WITH_TV)
  })

  it('go into a share link with the screen to the millimeter and the seat row as typed', () => {
    const dragged: RoomObjects = {
      seatRow: { width: 3.6576, depth: 0.9144 },
      screen: { ...defaultScreen(DEFAULT_ROOM), x: 0.123456789 },
    }

    expect(roundRoomObjectsForLink(dragged)).toEqual({
      seatRow: { width: 3.6576, depth: 0.9144 },
      screen: { ...dragged.screen, x: 0.123 },
    })
    expect(roundRoomObjectsForLink(DEFAULT_ROOM_OBJECTS)).toEqual(
      DEFAULT_ROOM_OBJECTS,
    )
  })
})
