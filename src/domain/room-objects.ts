/**
 * Room objects (GLOSSARY.md, ADR 0006): things in the Room besides the
 * speakers and the MLP that the user places, moves and sizes. They are
 * drawn and used for placement warnings, and never part of the estimated
 * response.
 *
 * The config holds them all in one `roomObjects` value, which a Room
 * without any has as NO_ROOM_OBJECTS (version 1 share links migrate to
 * it). So far it holds the Screen (#55); the couch (#54), furniture boxes
 * (#56) and openings (#57) join it here, each with its own module like
 * screen.ts, and each of the functions below grows a line for it.
 */
import type { FloorPoint, Room } from './room'
import {
  fitScreenToRoom,
  isValidScreen,
  roundScreenForLink,
  screenMovedTo,
  type RoomScreen,
} from './screen'

/** Every room object in a Room. */
export type RoomObjects = {
  /** The TV or projection screen on the front wall, or null for none. */
  screen: RoomScreen | null
}

/** A Room without room objects: as v1.0.0 drew every Room. */
export const NO_ROOM_OBJECTS: RoomObjects = { screen: null }

/** The id the room view drags the Screen by. */
export const SCREEN_ID = 'screen'

/** Every room object the room view can drag, by id. */
export const ROOM_OBJECT_IDS = [SCREEN_ID] as const

export type RoomObjectId = (typeof ROOM_OBJECT_IDS)[number]

/** Whether `id` names a room object (and not a speaker, subwoofer or the MLP). */
export function isRoomObjectId(id: string): id is RoomObjectId {
  return ROOM_OBJECT_IDS.some((objectId) => objectId === id)
}

/** Whether every room object is one a config may hold in `room`. */
export function areValidRoomObjects(
  room: Room,
  { screen }: RoomObjects,
): boolean {
  return screen === null || isValidScreen(room, screen)
}

/**
 * Every room object moved and sized, if needed, to fit `room` (after it
 * shrinks). Objects that fit stay as they were, and so does the whole
 * value when they all fit.
 */
export function keepRoomObjectsInRoom(
  room: Room,
  objects: RoomObjects,
): RoomObjects {
  const screen = objects.screen && fitScreenToRoom(room, objects.screen)
  return screen === objects.screen ? objects : { ...objects, screen }
}

/**
 * Room object `id` dragged on the floor plan to `to`. The Screen only
 * moves along the front wall, so only `to.x` counts. Comes back as it was
 * when there is no such object or it doesn't move.
 */
export function roomObjectsMoved(
  room: Room,
  objects: RoomObjects,
  id: RoomObjectId,
  to: FloorPoint,
): RoomObjects {
  switch (id) {
    case SCREEN_ID: {
      if (!objects.screen) return objects
      const screen = screenMovedTo(room, objects.screen, to.x)
      return screen === objects.screen ? objects : { ...objects, screen }
    }
  }
}

/** The room objects as a share link stores them: positions to the millimeter. */
export function roundRoomObjectsForLink({ screen }: RoomObjects): RoomObjects {
  return { screen: screen && roundScreenForLink(screen) }
}
