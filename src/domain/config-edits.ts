/**
 * Config edits: every change the store makes to the config is one of
 * these, so the config's rules (manual-positions.ts, the own-specs rule in
 * speaker-specs.ts, the accepted ranges) hold whoever edits it. Each takes
 * the config and gives the edited one, or the same config when the edit is
 * rejected or changes nothing, so the store records no empty undo step.
 *
 * The edits that move the MLP (a drag, "Move MLP here") and Auto-place
 * belong to the Auto-place module (auto-place.ts).
 */
import type { Config } from './config'
import { checkCrossover } from './crossover'
import type { Layout } from './layout'
import {
  clampToRoom,
  hasFixedHeight,
  keepInLayout,
  keepInRoom,
  MLP_ID,
  placeablesIn,
  positionLength,
  type PlaceableId,
  type PositionDimension,
} from './manual-positions'
import { positionOf } from './placed-items'
import { keepRoomObjectsInRoom } from './room-objects'
import { checkRange } from './range'
import {
  checkRoomDimension,
  type Room,
  type RoomDimension,
  type RoomPoint,
} from './room'
import {
  areValidSpeakerSpecs,
  areValidSubwooferSpecs,
  checkAmplifierWatts,
  keepOwnSpecsInLayout,
  withOwnSpecs,
  type SpeakerGroupId,
  type SpeakerGroups,
  type SubwooferGroup,
  type SubwooferSpecs,
} from './speaker-specs'
import type { SubwooferId } from './subwoofer-arrangements'
import { atDistanceFromWall } from './wall-frame'

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

/**
 * Item `id` made manual with one of its lengths (its height, or its
 * distance to a wall) set to `meters`. The config comes back as it was
 * when the value is outside the limits positionLengths gives (it is
 * rejected, not moved to the limit as a drag is), the item has no such
 * length (a fixed height) or the layout has no such item.
 */
export function withPositionLength(
  config: Config,
  id: PlaceableId,
  dimension: PositionDimension,
  meters: number,
): Config {
  const current = positionOf(config, id)
  if (!current) return config
  const length = positionLength(config.room, id, current, dimension)
  if (!length || checkRange(meters, length.limits) !== null) return config
  return placeManually(
    config,
    id,
    dimension === 'height'
      ? { z: meters }
      : atDistanceFromWall(config.room, current, dimension, meters),
  )
}

/**
 * The config in another Room; manual items, the seat the auto speakers
 * stay installed for (as if it were the MLP) and room objects the walls
 * moved past move in with them (and room objects shrink to fit).
 */
export function withRoom(config: Config, room: Room): Config {
  const { speakersInstalledFor } = config
  return {
    ...config,
    room,
    manualPositions: keepInRoom(room, config.manualPositions),
    speakersInstalledFor:
      speakersInstalledFor && clampToRoom(room, MLP_ID, speakersInstalledFor),
    roomObjects: keepRoomObjectsInRoom(room, config.roomObjects),
  }
}

/**
 * The config with another layout: items both layouts have keep their
 * manual positions, items only the old one had lose theirs, and new items
 * are auto.
 */
export function withLayout(config: Config, layout: Layout): Config {
  const { dolbyLayout, subwoofers } = config.layout
  if (layout.dolbyLayout === dolbyLayout && layout.subwoofers === subwoofers) {
    return config
  }
  // Own specs follow the subwoofer count (the own-specs rule); another
  // Dolby layout leaves the Subwoofers group as it is.
  const withSubwoofers =
    layout.subwoofers === subwoofers
      ? config
      : withSubwooferGroup(
          config,
          keepOwnSpecsInLayout(layout, config.speakerGroups.subwoofers),
        )
  return {
    ...withSubwoofers,
    layout,
    manualPositions: keepInLayout(layout, config.manualPositions),
  }
}

/**
 * One room dimension set to `meters`, as withRoom says. The config comes
 * back as it was when the value is outside the accepted range or the same.
 */
export function withRoomDimension(
  config: Config,
  dimension: RoomDimension,
  meters: number,
): Config {
  if (checkRoomDimension(dimension, meters) !== null) return config
  if (config.room[dimension] === meters) return config
  return withRoom(config, { ...config.room, [dimension]: meters })
}

/**
 * The specs of one speaker group other than the Subwoofers changed by
 * `change`. The config comes back as it was when a spec would be out of
 * range, or nothing changes.
 */
export function withSpeakerSpecs<G extends SpeakerGroupId>(
  config: Config,
  group: G,
  change: Partial<SpeakerGroups[G]['specs']>,
): Config {
  const current = config.speakerGroups[group].specs
  const specs = { ...current, ...change }
  if (!areValidSpeakerSpecs(specs) || changesNothing(current, change)) {
    return config
  }
  return {
    ...config,
    speakerGroups: { ...config.speakerGroups, [group]: { specs } },
  }
}

/**
 * The specs of the Subwoofers group, or the own specs of one subwoofer,
 * changed by `change`. The config comes back as it was when a spec would
 * be out of range (or the peak power below the RMS power), the subwoofer
 * has no own specs, or nothing changes.
 */
export function withSubwooferSpecs(
  config: Config,
  target: 'group' | SubwooferId,
  change: Partial<SubwooferSpecs>,
): Config {
  const group = config.speakerGroups.subwoofers
  const current = target === 'group' ? group.specs : group.ownSpecs[target]
  if (!current) return config
  const specs = { ...current, ...change }
  if (!areValidSubwooferSpecs(specs) || changesNothing(current, change)) {
    return config
  }
  return withSubwooferGroup(
    config,
    target === 'group'
      ? { ...group, specs }
      : { ...group, ownSpecs: { ...group.ownSpecs, [target]: specs } },
  )
}

/**
 * Subwoofer `subwoofer` given own specs, starting as a copy of the
 * group's, or made to use the group's again (dropping its own). The config
 * comes back as it was for a subwoofer not in the layout, or when nothing
 * changes.
 */
export function withSubwooferHasOwnSpecs(
  config: Config,
  subwoofer: SubwooferId,
  hasOwnSpecs: boolean,
): Config {
  return withSubwooferGroup(
    config,
    withOwnSpecs(
      config.layout,
      config.speakerGroups.subwoofers,
      subwoofer,
      hasOwnSpecs,
    ),
  )
}

/**
 * The amplifier power per channel set to `watts`. The config comes back
 * as it was when that is outside the accepted range or the same.
 */
export function withAmplifierWatts(config: Config, watts: number): Config {
  if (checkAmplifierWatts(watts) !== null) return config
  if (config.amplifierWatts === watts) return config
  return { ...config, amplifierWatts: watts }
}

/**
 * The crossover set to `hz`. The config comes back as it was when that is
 * outside the accepted range or the same.
 */
export function withCrossover(config: Config, hz: number): Config {
  if (checkCrossover(hz) !== null) return config
  if (config.crossoverHz === hz) return config
  return { ...config, crossoverHz: hz }
}

/**
 * The config with its Subwoofers speaker group replaced; the same config
 * for the same group.
 */
function withSubwooferGroup(
  config: Config,
  subwoofers: SubwooferGroup,
): Config {
  if (subwoofers === config.speakerGroups.subwoofers) return config
  return { ...config, speakerGroups: { ...config.speakerGroups, subwoofers } }
}

/** Whether every spec in `change` already has that value in `current`. */
function changesNothing<T extends object>(
  current: T,
  change: Partial<T>,
): boolean {
  return Object.entries(change).every(
    ([field, value]) => field in current && current[field as keyof T] === value,
  )
}
