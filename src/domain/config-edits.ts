/**
 * Config changes that touch manual positions, so the rules in
 * manual-positions.ts hold whoever edits the config: the store calls these
 * instead of writing positions itself.
 */
import type { Config } from './config'
import type { Layout } from './layout'
import {
  clampToRoom,
  keepInLayout,
  keepInRoom,
  placeablesIn,
  type PlaceableId,
} from './manual-positions'
import { positionOf } from './placements'
import {
  atDistanceFromWall,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'

/**
 * Item `id` made manual at its current position with `change` applied, and
 * kept where it may go (manual-positions.ts). The config comes back as it
 * was when the layout has no such item or a coordinate is not a number.
 */
export function placeManually(
  config: Config,
  id: PlaceableId,
  change: Partial<RoomPoint>,
): Config {
  if (Object.values(change).some((value) => !Number.isFinite(value))) {
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

/** The config in another Room; manual items the walls moved past move in with them. */
export function withRoom(config: Config, room: Room): Config {
  return {
    ...config,
    room,
    manualPositions: keepInRoom(room, config.manualPositions),
  }
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

/** Every item back to auto: what Auto-place does. */
export function withAutoPlacement(config: Config): Config {
  return { ...config, manualPositions: {} }
}
