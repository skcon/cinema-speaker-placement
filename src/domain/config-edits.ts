/**
 * Config changes that touch manual positions, so the rules in
 * manual-positions.ts hold whoever edits the config: the store calls these
 * instead of writing positions itself.
 */
import type { Config } from './config'
import type { Layout } from './layout'
import {
  clampToRoom,
  hasFixedHeight,
  keepInLayout,
  keepInRoom,
  MLP_ID,
  placeablesIn,
  type PlaceableId,
} from './manual-positions'
import {
  furnitureId,
  MAX_FURNITURE,
  newFurnitureBox,
  type FurnitureBox,
  type FurnitureId,
  type FurniturePreset,
} from './furniture'
import {
  MAX_OPENINGS,
  newOpening,
  openingIndex,
  type Opening,
  type OpeningId,
  type OpeningKind,
} from './openings'
import { positionOf } from './placements'
import {
  areValidRoomObjects,
  keepRoomObjectsInRoom,
  roomObjectsMoved,
  SEAT_ROW_ID,
  withFurnitureBox,
  withOpening,
  type RoomObjectId,
  type RoomObjects,
} from './room-objects'
import { withSeatRowDimension, type SeatRowDimension } from './seat-row'
import { recommendSeat } from './seat-score'
import type { RoomScreen } from './screen'
import {
  atDistanceFromWall,
  type FloorPoint,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'

/**
 * Item `id` made manual at its current position with `change` applied, and
 * kept where it may go (manual-positions.ts). The config comes back as it
 * was when the layout has no such item, a coordinate is not a number, or
 * only the height of an item with a fixed height would change.
 */
export function placeManually(
  config: Config,
  id: PlaceableId,
  change: Partial<RoomPoint>,
): Config {
  if (Object.values(change).some((value) => !Number.isFinite(value))) {
    return config
  }
  // A subwoofer or the MLP keeps its height: a height edit changes nothing.
  if (hasFixedHeight(id) && change.x === undefined && change.y === undefined) {
    return config
  }
  if (!placeablesIn(config.layout).includes(id)) return config
  const current = positionOf(config, id)
  if (!current) return config
  const position = clampToRoom(config.room, id, { ...current, ...change })
  return {
    ...config,
    manualPositions: { ...config.manualPositions, [id]: position },
  }
}

/** Item `id` made manual and moved to `meters` from `wall` (see placeManually). */
export function placeAtWallDistance(
  config: Config,
  id: PlaceableId,
  wall: Wall,
  meters: number,
): Config {
  const current = positionOf(config, id)
  if (!current || !Number.isFinite(meters)) return config
  return placeManually(
    config,
    id,
    atDistanceFromWall(config.room, current, wall, meters),
  )
}

/**
 * The config in another Room; manual items and room objects the walls
 * moved past move in with them (and room objects shrink to fit).
 */
export function withRoom(config: Config, room: Room): Config {
  return {
    ...config,
    room,
    manualPositions: keepInRoom(room, config.manualPositions),
    roomObjects: keepRoomObjectsInRoom(room, config.roomObjects),
  }
}

/**
 * The config with its room objects changed by `edit`, which gets the Room
 * and the current ones. Comes back as it was when the edit changes
 * nothing, or gives an object that doesn't fit the Room.
 */
export function withRoomObjects(
  config: Config,
  edit: (room: Room, objects: RoomObjects) => RoomObjects,
): Config {
  const roomObjects = edit(config.room, config.roomObjects)
  if (
    roomObjects === config.roomObjects ||
    JSON.stringify(roomObjects) === JSON.stringify(config.roomObjects) ||
    !areValidRoomObjects(config.room, roomObjects)
  ) {
    return config
  }
  return { ...config, roomObjects }
}

/**
 * Room object `id` dragged on the floor plan to `to` (see
 * roomObjectsMoved). The Seat row is where the MLP is, so dragging it
 * moves the MLP: `to` is where the MLP goes, which makes it manual and
 * keeps it inside its wall clearances, as dragging the MLP itself does.
 */
export function withRoomObjectMoved(
  config: Config,
  id: RoomObjectId,
  to: FloorPoint,
): Config {
  if (id === SEAT_ROW_ID) {
    const moved = placeManually(config, MLP_ID, { x: to.x, y: to.y })
    return samePositions(moved, config) ? config : moved
  }
  return withRoomObjects(config, (room, objects) =>
    roomObjectsMoved(room, objects, id, to),
  )
}

/**
 * The config with one of the Seat row's lengths changed. Comes back as it
 * was when the length is not accepted or doesn't change.
 */
export function withSeatRowSize(
  config: Config,
  dimension: SeatRowDimension,
  meters: number,
): Config {
  return withRoomObjects(config, (_, objects) => {
    const seatRow = withSeatRowDimension(objects.seatRow, dimension, meters)
    return seatRow ? { ...objects, seatRow } : objects
  })
}

/**
 * The config with another layout: items both layouts have keep their
 * manual positions, items only the old one had lose theirs, and new items
 * are auto.
 */
export function withLayout(config: Config, layout: Layout): Config {
  return {
    ...config,
    layout,
    manualPositions: keepInLayout(layout, config.manualPositions),
  }
}

/**
 * The MLP made manual at `seat`, the recommended seat the user is looking
 * at ("Move MLP here"). The config comes back as it was when the MLP
 * already is there.
 */
export function withMlpAtRecommendedSeat(
  config: Config,
  seat: RoomPoint,
): Config {
  const moved = placeManually(config, MLP_ID, { x: seat.x, y: seat.y })
  return samePositions(moved, config) ? config : moved
}

/**
 * What Auto-place does: every item back to auto, then the MLP at the
 * recommended seat for that (manual there, unless the auto MLP already is
 * the recommended seat). The config comes back as it was when that changes
 * nothing.
 */
export function withAutoPlacement(config: Config): Config {
  const reset: Config = { ...config, manualPositions: {} }
  const { recommended, mlpIsRecommended } = recommendSeat(reset)
  const placed = mlpIsRecommended
    ? reset
    : placeManually(reset, MLP_ID, {
        x: recommended.position.x,
        y: recommended.position.y,
      })
  return samePositions(placed, config) ? config : placed
}

/** Whether two configs have the same manual positions. */
function samePositions(a: Config, b: Config): boolean {
  return JSON.stringify(a.manualPositions) === JSON.stringify(b.manualPositions)
}

/**
 * The config with its Screen changed by `edit`, which gets the Room and
 * the current screen and returns the changed one, or null to reject the
 * change. Comes back as it was without a screen, or when the edit is
 * rejected or changes nothing.
 */
export function withScreenEdit(
  config: Config,
  edit: (room: Room, screen: RoomScreen) => RoomScreen | null,
): Config {
  return withRoomObjects(config, (room, objects) => {
    if (!objects.screen) return objects
    const screen = edit(room, objects.screen)
    return screen ? { ...objects, screen } : objects
  })
}

/**
 * The config with a furniture box from `preset` added (see
 * newFurnitureBox). Comes back as it was when the Room already has
 * MAX_FURNITURE boxes.
 */
export function withFurnitureAdded(
  config: Config,
  preset: FurniturePreset,
): Config {
  return withRoomObjects(config, (room, objects) =>
    objects.furniture.length >= MAX_FURNITURE
      ? objects
      : {
          ...objects,
          furniture: [...objects.furniture, newFurnitureBox(room, preset)],
        },
  )
}

/**
 * The config without furniture box `id`; the boxes after it move up a
 * place. Comes back as it was when there is no such box.
 */
export function withFurnitureRemoved(config: Config, id: FurnitureId): Config {
  return withRoomObjects(config, (_, objects) => {
    const index = furnitureIndexOf(objects, id)
    return index === null
      ? objects
      : {
          ...objects,
          furniture: objects.furniture.filter((__, at) => at !== index),
        }
  })
}

/**
 * The config with furniture box `id` changed by `edit`, which gets the
 * Room and the box and returns the changed one, or null to reject the
 * change. Comes back as it was without such a box, or when the edit is
 * rejected or changes nothing.
 */
export function withFurnitureEdit(
  config: Config,
  id: FurnitureId,
  edit: (room: Room, box: FurnitureBox) => FurnitureBox | null,
): Config {
  return withRoomObjects(config, (room, objects) =>
    withFurnitureBox(objects, id, (box) => edit(room, box)),
  )
}

/** Where box `id` is in the list, or null when there is no such box. */
function furnitureIndexOf(
  objects: RoomObjects,
  id: FurnitureId,
): number | null {
  const index = objects.furniture.findIndex((_, at) => furnitureId(at) === id)
  return index < 0 ? null : index
}

/**
 * The config with an opening of `kind` added (see newOpening). Comes back
 * as it was when the Room already has MAX_OPENINGS.
 */
export function withOpeningAdded(config: Config, kind: OpeningKind): Config {
  return withRoomObjects(config, (room, objects) =>
    objects.openings.length >= MAX_OPENINGS
      ? objects
      : {
          ...objects,
          openings: [...objects.openings, newOpening(room, kind)],
        },
  )
}

/**
 * The config without opening `id`; the openings after it move up a place.
 * Comes back as it was when there is no such opening.
 */
export function withOpeningRemoved(config: Config, id: OpeningId): Config {
  return withRoomObjects(config, (_, objects) => {
    const index = openingIndex(id)
    return index === null || index >= objects.openings.length
      ? objects
      : {
          ...objects,
          openings: objects.openings.filter((__, at) => at !== index),
        }
  })
}

/**
 * The config with opening `id` changed by `edit`, which gets the Room and
 * the opening and returns the changed one, or null to reject the change.
 * Comes back as it was without such an opening, or when the edit is
 * rejected or changes nothing.
 */
export function withOpeningEdit(
  config: Config,
  id: OpeningId,
  edit: (room: Room, opening: Opening) => Opening | null,
): Config {
  return withRoomObjects(config, (room, objects) =>
    withOpening(objects, id, (opening) => edit(room, opening)),
  )
}
