import { describe, expect, it } from 'vitest'
import {
  areValidRoomObjects,
  isRoomObjectId,
  keepRoomObjectsInRoom,
  NO_ROOM_OBJECTS,
  roomObjectsMoved,
  roundRoomObjectsForLink,
  SCREEN_ID,
  type RoomObjects,
} from './room-objects'
import { DEFAULT_ROOM } from './room'
import { defaultScreen } from './screen'

const WITH_TV: RoomObjects = { screen: defaultScreen(DEFAULT_ROOM) }

describe('room objects', () => {
  it('are none in a room without any, and that is valid', () => {
    expect(NO_ROOM_OBJECTS).toEqual({ screen: null })
    expect(areValidRoomObjects(DEFAULT_ROOM, NO_ROOM_OBJECTS)).toBe(true)
  })

  it('are valid with a screen that fits the room, and not otherwise', () => {
    expect(areValidRoomObjects(DEFAULT_ROOM, WITH_TV)).toBe(true)
    expect(
      areValidRoomObjects(
        { ...DEFAULT_ROOM, height: 2 },
        { screen: { ...defaultScreen(DEFAULT_ROOM), bottomEdge: 1.5 } },
      ),
    ).toBe(false)
  })

  it('name the screen by its id, and nothing else', () => {
    expect(isRoomObjectId(SCREEN_ID)).toBe(true)
    expect(isRoomObjectId('MLP')).toBe(false)
  })

  it('stay as they are when they fit a resized room', () => {
    expect(keepRoomObjectsInRoom({ ...DEFAULT_ROOM, width: 8 }, WITH_TV)).toBe(
      WITH_TV,
    )
    expect(keepRoomObjectsInRoom(DEFAULT_ROOM, NO_ROOM_OBJECTS)).toBe(
      NO_ROOM_OBJECTS,
    )
  })

  it('shrink with a room that gets narrower than the screen', () => {
    const wide: RoomObjects = {
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
      roomObjectsMoved(DEFAULT_ROOM, NO_ROOM_OBJECTS, SCREEN_ID, {
        x: 1,
        y: 0,
      }),
    ).toBe(NO_ROOM_OBJECTS)
    expect(
      roomObjectsMoved(DEFAULT_ROOM, WITH_TV, SCREEN_ID, { x: 0, y: 2 }),
    ).toBe(WITH_TV)
  })

  it('go into a share link with the screen to the millimeter', () => {
    const dragged: RoomObjects = {
      screen: { ...defaultScreen(DEFAULT_ROOM), x: 0.123456789 },
    }

    expect(roundRoomObjectsForLink(dragged).screen?.x).toBe(0.123)
    expect(roundRoomObjectsForLink(NO_ROOM_OBJECTS)).toEqual(NO_ROOM_OBJECTS)
  })
})
