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
import { positionOf } from './placements'
import { recommendSeat } from './seat-score'
import {
  atDistanceFromWall,
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
