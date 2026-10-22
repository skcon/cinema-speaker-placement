/**
 * Link precision: which config lengths a share link stores to the
 * millimeter, and the slack that gives validity. Part of the share-link
 * wire format (ADR 0003), owned by the codec: share-link.ts writes every
 * length LINK_MILLIMETER_LENGTHS lists to the millimeter, and nothing
 * else.
 *
 * Dragged positions come with 17 significant digits, and a typed imperial
 * size is a long binary fraction in meters; stored as they are, they would
 * not fit the URL budget. The millimeter is well under the 0.1 in the app
 * shows, and nobody mounts a speaker more precisely. Sizes that are only
 * ever typed in meters (the room, the seat row, the screen) stay as they
 * are, so they come back to their last digit.
 *
 * Rounding can put an item that was exactly on its limit up to half a
 * millimeter past it for each stored length the limit adds up, so validity
 * (the config schema) allows linkSlack(part) there, or a link the app
 * wrote would not open again.
 *
 * LINK_MILLIMETER_LENGTHS is the table of config version 3, the current
 * version, and V2_MILLIMETER_LENGTHS that of version 2: their entries in
 * CONFIG_VERSIONS (share-link.ts) name them, and config-v2.ts and
 * config-v3.ts keep a copy of the slack they give. Each table is frozen
 * with its version's release: a length that is stored to the millimeter,
 * or a slack, changes only with a new schema version, which gets a table
 * of its own. Version 3 adds the seat the auto speakers stay installed
 * for (Speakers follow the seat off, #123), stored as a manual position
 * is.
 *
 * It imports types only, so the room-object modules can read their slack
 * without depending on the codec.
 */
import type { FurnitureBox } from './furniture'
import type { Door, WindowOpening } from './openings'
import type { RoomPoint } from './room'
import type { RoomScreen } from './screen'

/** One part of the config whose lengths a link stores to the millimeter. */
export type LinkLengths<Item> = {
  /** Its lengths a link stores to the millimeter. */
  readonly lengths: readonly (keyof Item & string)[]
  /**
   * How many of those lengths one check of where it may be adds up (an
   * edge is a position plus half a size): what its slack is made of.
   */
  readonly perEdge: number
}

/**
 * The lengths a version 2 link stores to the millimeter, by part of the
 * config: every manual position (speakers, subwoofers, the MLP), where
 * the screen was dragged to, and every length of a furniture box and of
 * an opening (a door has no sill or height). Openings go into the link as
 * whole millimeters (share-link.ts packs them). Released (v1.1.0): never
 * change it.
 */
export const V2_MILLIMETER_LENGTHS = {
  manualPositions: { lengths: ['x', 'y', 'z'], perEdge: 1 },
  screen: { lengths: ['x'], perEdge: 1 },
  furniture: { lengths: ['width', 'depth', 'height', 'x', 'y'], perEdge: 2 },
  openings: { lengths: ['position', 'width', 'sill', 'height'], perEdge: 2 },
} as const satisfies MillimeterLengths

/**
 * The lengths a link of the current version (3) stores to the
 * millimeter: version 2's, and the seat the auto speakers stay installed
 * for, a point like the MLP's manual position, with its slack.
 */
export const LINK_MILLIMETER_LENGTHS = {
  ...V2_MILLIMETER_LENGTHS,
  speakersInstalledFor: { lengths: ['x', 'y', 'z'], perEdge: 1 },
} as const satisfies Required<MillimeterLengths>

/**
 * The lengths a config version's links store to the millimeter, by part
 * of the config: a part the table leaves out is stored as it is.
 */
export type MillimeterLengths = {
  readonly manualPositions?: LinkLengths<RoomPoint>
  readonly screen?: LinkLengths<RoomScreen>
  readonly furniture?: LinkLengths<FurnitureBox>
  readonly openings?: LinkLengths<Door & WindowOpening>
  readonly speakersInstalledFor?: LinkLengths<RoomPoint>
}

/** A part of the config whose lengths a link stores to the millimeter. */
export type LinkPart = keyof typeof LINK_MILLIMETER_LENGTHS

export const MILLIMETERS_PER_METER = 1000

/** How far a length a link stores may be from the one written, in meters. */
const ROUNDING_ERROR = 0.5 / MILLIMETERS_PER_METER

/** A length rounded to the nearest millimeter. */
export function toMillimeter(meters: number): number {
  // `+ 0` turns -0 into 0, so the JSON stays as short as it can be.
  return Math.round(meters * MILLIMETERS_PER_METER) / MILLIMETERS_PER_METER + 0
}

/**
 * How far past where it may be validity lets `part` be, in meters: half a
 * millimeter for each length one of its checks adds up (see above). The
 * same slack for every check of that part.
 */
export function linkSlack(part: LinkPart): number {
  return LINK_MILLIMETER_LENGTHS[part].perEdge * ROUNDING_ERROR
}
