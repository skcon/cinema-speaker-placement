/**
 * Room objects (GLOSSARY.md, ADR 0006): things in the Room besides the
 * speakers and the MLP that the user places, moves and sizes. They are
 * drawn and used for placement warnings, and never part of the estimated
 * response.
 *
 * This module owns the Room's room objects as a whole: their lists, their
 * ids and how many of each a Room may have, adding, removing and editing
 * one by id, fitting them into a resized Room, and whether they are valid.
 * Each kind's own module (seat-row.ts, screen.ts, furniture.ts,
 * openings.ts) only knows one object of its kind: its geometry, its
 * limits and how it moves. Inside this module, a new kind of room object
 * is a field in RoomObjects, a line in RoomObjectKinds, its id and its
 * addition, its list in objectsOf and withObjectsOf, and an entry in
 * KIND_RULES; adding, removing, editing, moving, fitting and validity are
 * the same code for every kind.
 *
 * The config holds them all in one `roomObjects` value, which starts as
 * DEFAULT_ROOM_OBJECTS: the default Seat row and nothing else (version 1
 * share links migrate to it, with their seat row width).
 */
import {
  fitFurnitureToRoom,
  furnitureMovedTo,
  isValidFurnitureBox,
  newFurnitureBox,
  roundFurnitureForLink,
  type FurnitureBox,
  type FurniturePreset,
} from './furniture'
import {
  fitOpeningToRoom,
  isValidOpening,
  newOpening,
  openingMovedTo,
  roundOpeningForLink,
  type Opening,
  type OpeningKind,
} from './openings'
import { FURNITURE, OPENINGS } from './reference'
import type { FloorPoint, Room } from './room'
import {
  defaultScreen,
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
   * added: each is named by its place here (see roomObjectId).
   */
  furniture: readonly FurnitureBox[]
  /**
   * The doors and windows on the walls, at most MAX_OPENINGS, in the order
   * they were added: each is named by its place here (see roomObjectId).
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

/** What one room object of each kind is. */
type RoomObjectKinds = {
  seatRow: SeatRow
  screen: RoomScreen
  furniture: FurnitureBox
  opening: Opening
}

/** A kind of room object. */
export type RoomObjectKind = keyof RoomObjectKinds

/** The kinds a Room may have several of, each in a list. */
export type ListedRoomObjectKind = 'furniture' | 'opening'

/** The most furniture boxes a Room has (ADR 0006). */
export const MAX_FURNITURE: number = FURNITURE.maxCount

/** The most openings a Room has (ADR 0006). */
export const MAX_OPENINGS: number = OPENINGS.maxCount

/** The id the room view drags the Seat row by. */
export const SEAT_ROW_ID = 'seatRow'

/** The id the room view drags the Screen by. */
export const SCREEN_ID = 'screen'

/** The id of furniture box `n` (from 1): its place in the list. */
export type FurnitureId = `furniture-${number}`

/** The id of opening `n` (from 1): its place in the list. */
export type OpeningId = `opening-${number}`

/**
 * A room object's id: the seat row's and the screen's are their kind (a
 * Room has at most one), a furniture box's or an opening's is its kind and
 * its place in its list, from 1 (see roomObjectId). An id may name an
 * object the Room doesn't have.
 */
export type RoomObjectId =
  typeof SEAT_ROW_ID | typeof SCREEN_ID | FurnitureId | OpeningId

/** The room object an id of type `I` names. */
export type RoomObjectOf<I extends RoomObjectId> = I extends typeof SEAT_ROW_ID
  ? SeatRow
  : I extends typeof SCREEN_ID
    ? RoomScreen
    : I extends FurnitureId
      ? FurnitureBox
      : I extends OpeningId
        ? Opening
        : never

/**
 * A change to room object `I`: gets the Room and the object, and returns
 * the changed object, or null to reject the change. A kind module's
 * `with...` functions are edits once the Room and the object are given.
 */
export type RoomObjectEdit<I extends RoomObjectId> = (
  room: Room,
  object: RoomObjectOf<I>,
) => RoomObjectOf<I> | null

/** A room object to add: what it is, and for a list kind which preset. */
export type RoomObjectAddition =
  | { kind: 'screen' }
  | { kind: 'furniture'; preset: FurniturePreset }
  | { kind: 'opening'; preset: OpeningKind }

/**
 * What the room objects module needs of a config: the Room and its room
 * objects. Every change below takes and gives back the whole value, so it
 * works on a Config and keeps its other fields.
 */
export type RoomWithObjects = {
  readonly room: Room
  readonly roomObjects: RoomObjects
}

/** What this module knows about each kind (each kind's module has the rest). */
type KindRules<T> = {
  /** How many a Room has at least and at most. */
  readonly count: { readonly min: number; readonly max: number }
  /** Whether one is one a config may hold in `room`. */
  readonly isValid: (room: Room, object: T) => boolean
  /** It moved and sized, if needed, to fit `room`; as it was if it fits. */
  readonly fit: (room: Room, object: T) => T
  /** It dragged on the floor plan to `to`; as it was if it doesn't move. */
  readonly movedTo: (room: Room, object: T, to: FloorPoint) => T
}

const KIND_RULES: { [K in RoomObjectKind]: KindRules<RoomObjectKinds[K]> } = {
  // Every Room has exactly one seat row. It keeps its size in a smaller
  // Room (it is drawn cut off at the walls) and stores no position: it is
  // where the MLP is, so a drag of it moves the MLP instead (see
  // withDragged in drag-targets.ts).
  seatRow: {
    count: { min: 1, max: 1 },
    isValid: (_, seatRow) => isValidSeatRow(seatRow),
    fit: (_, seatRow) => seatRow,
    movedTo: (_, seatRow) => seatRow,
  },
  // The Screen only moves along the front wall, so only `to.x` counts.
  screen: {
    count: { min: 0, max: 1 },
    isValid: isValidScreen,
    fit: fitScreenToRoom,
    movedTo: (room, screen, to) => screenMovedTo(room, screen, to.x),
  },
  furniture: {
    count: { min: 0, max: MAX_FURNITURE },
    isValid: isValidFurnitureBox,
    fit: fitFurnitureToRoom,
    movedTo: furnitureMovedTo,
  },
  // An opening only moves along its own wall.
  opening: {
    count: { min: 0, max: MAX_OPENINGS },
    isValid: isValidOpening,
    fit: fitOpeningToRoom,
    movedTo: openingMovedTo,
  },
}

const KINDS = Object.keys(KIND_RULES) as RoomObjectKind[]

/** The room objects of `kind`, as a list (the seat row and screen too). */
function objectsOf<K extends RoomObjectKind>(
  objects: RoomObjects,
  kind: K,
): readonly RoomObjectKinds[K][] {
  const lists: { [Kind in RoomObjectKind]: readonly RoomObjectKinds[Kind][] } =
    {
      seatRow: [objects.seatRow],
      screen: objects.screen ? [objects.screen] : [],
      furniture: objects.furniture,
      opening: objects.openings,
    }
  return lists[kind]
}

/**
 * The room objects with those of `kind` replaced by `list`, which has
 * between KIND_RULES[kind].count.min and max of them.
 */
function withObjectsOf<K extends RoomObjectKind>(
  objects: RoomObjects,
  kind: K,
  list: readonly RoomObjectKinds[K][],
): RoomObjects {
  const of = list as readonly RoomObjectKinds[RoomObjectKind][]
  switch (kind) {
    case 'seatRow':
      return { ...objects, seatRow: of[0] as SeatRow }
    case 'screen':
      return { ...objects, screen: (of[0] as RoomScreen | undefined) ?? null }
    case 'furniture':
      return { ...objects, furniture: of as readonly FurnitureBox[] }
    default:
      return { ...objects, openings: of as readonly Opening[] }
  }
}

/** Where a room object is: its kind and its place in that kind's list. */
type RoomObjectPlace = { kind: RoomObjectKind; index: number }

const LISTED_ID = /^(furniture|opening)-([1-9]\d*)$/

/**
 * The kind and place `id` names, or null when it is not a room object's
 * id (a speaker's, a subwoofer's or the MLP's). The one parser of the
 * format roomObjectId writes.
 */
function placeOf(id: string): RoomObjectPlace | null {
  if (id === SEAT_ROW_ID || id === SCREEN_ID) return { kind: id, index: 0 }
  const match = LISTED_ID.exec(id)
  if (!match) return null
  return {
    kind: match[1] as ListedRoomObjectKind,
    index: Number(match[2]) - 1,
  }
}

/**
 * The id of the room object of a list kind at `index` (from 0) in its
 * list, for example `furniture-1` for the first furniture box: the room
 * view, the sidebar and the placement warnings name it by this.
 */
export function roomObjectId(kind: 'furniture', index: number): FurnitureId
export function roomObjectId(kind: 'opening', index: number): OpeningId
export function roomObjectId(
  kind: ListedRoomObjectKind,
  index: number,
): FurnitureId | OpeningId
export function roomObjectId(
  kind: ListedRoomObjectKind,
  index: number,
): FurnitureId | OpeningId {
  return `${kind}-${index + 1}`
}

/**
 * Whether `id` names a room object (and not a speaker, subwoofer or the
 * MLP). The Room may not have it.
 */
export function isRoomObjectId(id: string): id is RoomObjectId {
  return placeOf(id) !== null
}

/**
 * The kind of room object `id` names, or null when it is not a room
 * object's id.
 */
export function roomObjectKind(id: string): RoomObjectKind | null {
  return placeOf(id)?.kind ?? null
}

/** The room object `id` names, or null when the Room doesn't have it. */
export function roomObjectAt<I extends RoomObjectId>(
  objects: RoomObjects,
  id: I,
): RoomObjectOf<I> | null {
  const place = placeOf(id)
  if (!place) return null
  const object = objectsOf(objects, place.kind)[place.index]
  return (object ?? null) as RoomObjectOf<I> | null
}

/** Whether every room object is one a config may hold in `room`. */
export function areValidRoomObjects(room: Room, objects: RoomObjects): boolean {
  return KINDS.every((kind) => {
    const rules = KIND_RULES[kind] as KindRules<RoomObjectKinds[typeof kind]>
    const list = objectsOf(objects, kind)
    return (
      list.length >= rules.count.min &&
      list.length <= rules.count.max &&
      list.every((object) => rules.isValid(room, object))
    )
  })
}

/**
 * `items` each changed by `change`, or the same list when every item comes
 * back as it was.
 */
function mapEach<T>(items: readonly T[], change: (item: T) => T): readonly T[] {
  const changed = items.map(change)
  return changed.every((item, index) => item === items[index]) ? items : changed
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
  return KINDS.reduce((kept, kind) => {
    const rules = KIND_RULES[kind] as KindRules<RoomObjectKinds[typeof kind]>
    const list = objectsOf(kept, kind)
    const fitted = mapEach(list, (object) => rules.fit(room, object))
    return fitted === list ? kept : withObjectsOf(kept, kind, fitted)
  }, objects)
}

/**
 * The config with `roomObjects`, or as it was when they are the same as
 * its own or one doesn't fit its Room: so every change below gives a
 * valid config, and an empty change makes no new one.
 */
function settle<C extends RoomWithObjects>(
  config: C,
  roomObjects: RoomObjects,
): C {
  if (
    roomObjects === config.roomObjects ||
    JSON.stringify(roomObjects) === JSON.stringify(config.roomObjects) ||
    !areValidRoomObjects(config.room, roomObjects)
  ) {
    return config
  }
  return { ...config, roomObjects }
}

/** The new room object `addition` asks for, made to fit `room`. */
function newRoomObject(
  room: Room,
  addition: RoomObjectAddition,
): RoomObjectKinds[RoomObjectAddition['kind']] {
  switch (addition.kind) {
    case 'screen':
      return defaultScreen(room)
    case 'furniture':
      return newFurnitureBox(room, addition.preset)
    case 'opening':
      return newOpening(room, addition.preset)
  }
}

/**
 * The config with the room object `addition` asks for added at the end of
 * its list: the default TV centred on the front wall (defaultScreen), a
 * furniture box from a preset against the middle of the front wall
 * (newFurnitureBox), or a door or window (newOpening). Comes back as it
 * was when the Room already has as many of that kind as it may (one
 * screen, MAX_FURNITURE, MAX_OPENINGS).
 */
export function withRoomObjectAdded<C extends RoomWithObjects>(
  config: C,
  addition: RoomObjectAddition,
): C {
  const { kind } = addition
  const list = objectsOf(config.roomObjects, kind)
  if (list.length >= KIND_RULES[kind].count.max) return config
  const added = [...list, newRoomObject(config.room, addition)]
  return settle(config, withObjectsOf(config.roomObjects, kind, added))
}

/**
 * The config without room object `id`; the objects after it in its list
 * move up a place (and so take the next id down). Comes back as it was
 * when there is no such object, or it is the seat row (every Room has
 * one).
 */
export function withRoomObjectRemoved<C extends RoomWithObjects>(
  config: C,
  id: RoomObjectId,
): C {
  const place = placeOf(id)
  if (!place) return config
  const list = objectsOf(config.roomObjects, place.kind)
  if (
    place.index >= list.length ||
    list.length <= KIND_RULES[place.kind].count.min
  ) {
    return config
  }
  const kept = list.filter((_, at) => at !== place.index)
  return settle(config, withObjectsOf(config.roomObjects, place.kind, kept))
}

/**
 * The config with room object `id` changed by `edit` (see
 * RoomObjectEdit). Comes back as it was when there is no such object, or
 * the edit rejects or keeps it, or gives one that doesn't fit the Room.
 */
export function withRoomObjectEdited<
  C extends RoomWithObjects,
  I extends RoomObjectId,
>(config: C, id: I, edit: RoomObjectEdit<I>): C {
  const place = placeOf(id)
  const object = roomObjectAt(config.roomObjects, id)
  if (!place || !object) return config
  const edited = edit(config.room, object)
  if (!edited || edited === object) return config
  const list = objectsOf(config.roomObjects, place.kind)
  const changed = list.map((other, at) => (at === place.index ? edited : other))
  return settle(
    config,
    withObjectsOf(
      config.roomObjects,
      place.kind,
      changed as readonly RoomObjectKinds[RoomObjectKind][],
    ),
  )
}

/**
 * The config with room object `id` dragged on the floor plan to `to`, its
 * middle to `to` (stopped at the walls). The Screen only moves along the
 * front wall, so only `to.x` counts, and an opening only along its own
 * wall. The Seat row stores no position (it is where the MLP is), so it
 * stays as it is here: dragging it moves the MLP (withDragged in
 * drag-targets.ts). Comes back as it was when there is no such object or
 * it doesn't move.
 */
export function withRoomObjectMoved<C extends RoomWithObjects>(
  config: C,
  id: RoomObjectId,
  to: FloorPoint,
): C {
  const kind = placeOf(id)?.kind
  if (!kind) return config
  const rules = KIND_RULES[kind] as KindRules<RoomObjectKinds[typeof kind]>
  return withRoomObjectEdited(config, id, (room, object) =>
    rules.movedTo(room, object, to),
  )
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
