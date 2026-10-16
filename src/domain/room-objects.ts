/**
 * Room objects (GLOSSARY.md, ADR 0006): things in the Room besides the
 * speakers and the MLP that the user places, moves and sizes. They are
 * drawn and used for placement warnings, and never part of the estimated
 * response.
 *
 * The config holds them all in one `roomObjects` value, which starts as
 * DEFAULT_ROOM_OBJECTS: the default Seat row and nothing else (version 1
 * share links migrate to it, with their seat row width). So far it holds
 * the Seat row (#54) and the Screen (#55); furniture boxes (#56) and
 * openings (#57) join it here, each with its own module like screen.ts,
 * and each of the functions below grows a line for it.
 */
import type { FloorPoint, Room } from './room'
import {
  fitScreenToRoom,
  isValidScreen,
  roundScreenForLink,
  screenMovedTo,
  type RoomScreen,
} from './screen'
import { DEFAULT_SEAT_ROW, isValidSeatRow, type SeatRow } from './seat-row'

/** Every room object in a Room. */
export type RoomObjects = {
  /**
   * The couch the MLP sits on: its size only. Every Room has one, and
   * where it is follows the MLP (seat-row.ts).
   */
  seatRow: SeatRow
  /** The TV or projection screen on the front wall, or null for none. */
  screen: RoomScreen | null
}

/** The room objects a Room starts with: the default seat row, no screen. */
export const DEFAULT_ROOM_OBJECTS: RoomObjects = {
  seatRow: DEFAULT_SEAT_ROW,
  screen: null,
}

/** The id the room view drags the Seat row by. */
export const SEAT_ROW_ID = 'seatRow'

/** The id the room view drags the Screen by. */
export const SCREEN_ID = 'screen'

/** Every room object the room view can drag, by id. */
export const ROOM_OBJECT_IDS = [SEAT_ROW_ID, SCREEN_ID] as const

export type RoomObjectId = (typeof ROOM_OBJECT_IDS)[number]

/** Whether `id` names a room object (and not a speaker, subwoofer or the MLP). */
export function isRoomObjectId(id: string): id is RoomObjectId {
  return ROOM_OBJECT_IDS.some((objectId) => objectId === id)
}

/** Whether every room object is one a config may hold in `room`. */
export function areValidRoomObjects(
  room: Room,
  { seatRow, screen }: RoomObjects,
): boolean {
  return (
    isValidSeatRow(seatRow) && (screen === null || isValidScreen(room, screen))
  )
}

/**
 * Every room object moved and sized, if needed, to fit `room` (after it
 * shrinks). Objects that fit stay as they were, and so does the whole
 * value when they all fit. The seat row keeps its size: it moves with the
 * MLP, and is drawn cut off where it meets a wall.
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
 * moves along the front wall, so only `to.x` counts. The Seat row stores
 * no position (it is where the MLP is), so a drag of it moves the MLP
 * instead (withRoomObjectMoved) and leaves these as they are. Comes back
 * as it was when there is no such object or it doesn't move.
 */
export function roomObjectsMoved(
  room: Room,
  objects: RoomObjects,
  id: RoomObjectId,
  to: FloorPoint,
): RoomObjects {
  switch (id) {
    case SEAT_ROW_ID:
      return objects
    case SCREEN_ID: {
      if (!objects.screen) return objects
      const screen = screenMovedTo(room, objects.screen, to.x)
      return screen === objects.screen ? objects : { ...objects, screen }
    }
  }
}

/**
 * The room objects as a share link stores them: positions to the
 * millimeter. Sizes are typed, not dragged, so they stay as they are.
 */
export function roundRoomObjectsForLink({
  seatRow,
  screen,
}: RoomObjects): RoomObjects {
  return { seatRow, screen: screen && roundScreenForLink(screen) }
}
