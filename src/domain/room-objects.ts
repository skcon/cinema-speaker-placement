/**
 * Room objects (GLOSSARY.md, ADR 0006): things in the Room besides the
 * speakers and the MLP that the user places, moves and sizes. They are
 * drawn and used for placement warnings, and never part of the estimated
 * response.
 *
 * The config holds them all in one `roomObjects` value, which starts as
 * DEFAULT_ROOM_OBJECTS: the default Seat row and nothing else (version 1
 * share links migrate to it, with their seat row width). It holds the
 * Seat row (#54), the Screen (#55), furniture boxes (#56) and openings
 * (#57), each with its own module (seat-row.ts, screen.ts, furniture.ts,
 * openings.ts); a new kind of room object grows a line in each function
 * below.
 */
import {
  fitFurnitureToRoom,
  furnitureId,
  furnitureIndex,
  furnitureMovedTo,
  isFurnitureId,
  isValidFurniture,
  roundFurnitureForLink,
  type FurnitureBox,
  type FurnitureId,
} from './furniture'
import {
  fitOpeningToRoom,
  isOpeningId,
  isValidOpenings,
  openingId,
  openingIndex,
  openingMovedTo,
  roundOpeningForLink,
  type Opening,
  type OpeningId,
} from './openings'
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
  /**
   * The furniture boxes, at most MAX_FURNITURE, in the order they were
   * added: the room view names each by its place here (furnitureId).
   */
  furniture: readonly FurnitureBox[]
  /**
   * The doors and windows on the walls, at most MAX_OPENINGS, in the order
   * they were added: the room view names each by its place here
   * (openingId).
   */
  openings: readonly Opening[]
}

/**
 * The room objects a Room starts with: the default seat row, no screen,
 * no furniture and no openings.
 */
export const DEFAULT_ROOM_OBJECTS: RoomObjects = {
  seatRow: DEFAULT_SEAT_ROW,
  screen: null,
  furniture: [],
  openings: [],
}

/** The id the room view drags the Seat row by. */
export const SEAT_ROW_ID = 'seatRow'

/** The id the room view drags the Screen by. */
export const SCREEN_ID = 'screen'

/** The room objects the room view can drag that there is one of, by id. */
export const ROOM_OBJECT_IDS = [SEAT_ROW_ID, SCREEN_ID] as const

/**
 * A room object the room view can drag: the seat row, the screen, or a
 * furniture box or an opening by its place in its list (furnitureId,
 * openingId).
 */
export type RoomObjectId =
  (typeof ROOM_OBJECT_IDS)[number] | FurnitureId | OpeningId

/** Whether `id` names a room object (and not a speaker, subwoofer or the MLP). */
export function isRoomObjectId(id: string): id is RoomObjectId {
  return (
    ROOM_OBJECT_IDS.some((objectId) => objectId === id) ||
    isFurnitureId(id) ||
    isOpeningId(id)
  )
}

/** The room view's ids of the Room's furniture boxes, in their order. */
export function furnitureIds(objects: RoomObjects): FurnitureId[] {
  return objects.furniture.map((_, index) => furnitureId(index))
}

/** The room view's ids of the Room's openings, in their order. */
export function openingIds(objects: RoomObjects): OpeningId[] {
  return objects.openings.map((_, index) => openingId(index))
}

/** Whether every room object is one a config may hold in `room`. */
export function areValidRoomObjects(
  room: Room,
  { seatRow, screen, furniture, openings }: RoomObjects,
): boolean {
  return (
    isValidSeatRow(seatRow) &&
    (screen === null || isValidScreen(room, screen)) &&
    isValidFurniture(room, furniture) &&
    isValidOpenings(room, openings)
  )
}

/**
 * `items` each fitted by `fit`, or the same list when every item comes
 * back as it was.
 */
function fitEach<T>(items: readonly T[], fit: (item: T) => T): readonly T[] {
  const fitted = items.map(fit)
  return fitted.every((item, index) => item === items[index]) ? items : fitted
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
  const furniture = fitEach(objects.furniture, (box) =>
    fitFurnitureToRoom(room, box),
  )
  const openings = fitEach(objects.openings, (opening) =>
    fitOpeningToRoom(room, opening),
  )
  return screen === objects.screen &&
    furniture === objects.furniture &&
    openings === objects.openings
    ? objects
    : { ...objects, screen, furniture, openings }
}

/**
 * Room object `id` dragged on the floor plan to `to`, its middle to `to`
 * (stopped at the walls). The Screen only
 * moves along the front wall, so only `to.x` counts, and an opening only
 * along its own wall. The Seat row stores
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
    default:
      return isOpeningId(id)
        ? withOpening(objects, id, (opening) =>
            openingMovedTo(room, opening, to),
          )
        : withFurnitureBox(objects, id, (box) =>
            furnitureMovedTo(room, box, to),
          )
  }
}

/**
 * The room objects with furniture box `id` changed by `edit`, which
 * returns the changed box, or null to reject the change. Come back as they
 * were when there is no such box, or the edit rejects or keeps it.
 */
export function withFurnitureBox(
  objects: RoomObjects,
  id: FurnitureId,
  edit: (box: FurnitureBox) => FurnitureBox | null,
): RoomObjects {
  const index = furnitureIndex(id)
  const box = index === null ? undefined : objects.furniture[index]
  if (index === null || !box) return objects
  const edited = edit(box)
  if (!edited || edited === box) return objects
  return {
    ...objects,
    furniture: objects.furniture.map((other, at) =>
      at === index ? edited : other,
    ),
  }
}

/**
 * The room objects with opening `id` changed by `edit`, which returns the
 * changed opening, or null to reject the change. Come back as they were
 * when there is no such opening, or the edit rejects or keeps it.
 */
export function withOpening(
  objects: RoomObjects,
  id: OpeningId,
  edit: (opening: Opening) => Opening | null,
): RoomObjects {
  const index = openingIndex(id)
  const opening = index === null ? undefined : objects.openings[index]
  if (index === null || !opening) return objects
  const edited = edit(opening)
  if (!edited || edited === opening) return objects
  return {
    ...objects,
    openings: objects.openings.map((other, at) =>
      at === index ? edited : other,
    ),
  }
}

/**
 * The room objects as a share link stores them: positions to the
 * millimeter. The seat row's and the screen's sizes are typed, not
 * dragged, so they stay as they are; furniture boxes and openings are
 * stored to the millimeter, sizes too (see roundFurnitureForLink and
 * roundOpeningForLink).
 */
export function roundRoomObjectsForLink({
  seatRow,
  screen,
  furniture,
  openings,
}: RoomObjects): RoomObjects {
  return {
    seatRow,
    screen: screen && roundScreenForLink(screen),
    furniture: furniture.map(roundFurnitureForLink),
    openings: openings.map(roundOpeningForLink),
  }
}
