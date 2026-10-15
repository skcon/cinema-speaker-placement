/**
 * Recent rooms: the encoded configs of rooms worked on in this browser,
 * newest first (ADR 0001: a per-browser convenience; the share link stays
 * the save feature). Pure list logic; reading and writing browser storage
 * is the state layer's job.
 *
 * Entries saved by a newer version of the app (in another tab, before this
 * one reloaded) can't be opened here, but are kept for that version: at
 * most NEWER_ROOMS_LIMIT of them, on top of the RECENT_ROOMS_LIMIT rooms
 * this version can open, so they never crowd those out. Damaged entries
 * are dropped.
 */
import { z } from 'zod'
import type { Config } from './config'
import { formatLayout } from './layout'
import { decodeConfig, encodeConfig, type EncodedConfig } from './share-link'
import { formatLength } from './units'

/** A room worked on in this browser: its encoded config and when it was saved. */
export type RecentRoom = {
  encoded: EncodedConfig
  /** When it was last saved, in milliseconds since the epoch. */
  savedAt: number
}

/** How many rooms this version can open are kept; saving another drops the oldest. */
export const RECENT_ROOMS_LIMIT = 10

/** How many rooms saved by a newer version of the app are kept besides. */
const NEWER_ROOMS_LIMIT = 5

/**
 * The list with `room` first, newest first: one entry per encoded config,
 * within the limits. `replacing` is the encoded config of the entry `room`
 * was edited from, which it takes the place of, so editing a room keeps
 * one entry for it rather than one per edit.
 */
export function saveRecentRoom(
  rooms: readonly RecentRoom[],
  room: RecentRoom,
  replacing?: EncodedConfig,
): RecentRoom[] {
  const others = rooms.filter(
    ({ encoded }) => encoded !== room.encoded && encoded !== replacing,
  )
  return withinLimits([room, ...others])
}

/** The list without the entry for `encoded`. */
export function removeRecentRoom(
  rooms: readonly RecentRoom[],
  encoded: EncodedConfig,
): RecentRoom[] {
  return rooms.filter((room) => room.encoded !== encoded)
}

/** Recent rooms as the text they are stored as. */
export function serializeRecentRooms(rooms: readonly RecentRoom[]): string {
  return JSON.stringify(rooms)
}

const recentRoomSchema = z.object({
  encoded: z.string().min(1),
  savedAt: z.number(),
})

/**
 * The recent rooms in stored text, or none for nothing stored. Never
 * throws: the text may be damaged, hand-edited or from another version of
 * the app, so anything that isn't a recent room is skipped, rooms saved by
 * an older version are upgraded to today's encoding, and repeats and
 * entries past the limits are dropped.
 */
export function parseRecentRooms(stored: string | null): RecentRoom[] {
  if (stored === null) return []
  let json: unknown
  try {
    json = JSON.parse(stored)
  } catch {
    return []
  }
  if (!Array.isArray(json)) return []
  const rooms = json.flatMap((entry) => {
    const result = recentRoomSchema.safeParse(entry)
    // Branded here; withinLimits drops what doesn't decode.
    return result.success
      ? [
          {
            ...result.data,
            encoded: asWrittenToday(result.data.encoded as EncodedConfig),
          },
        ]
      : []
  })
  return withinLimits(
    rooms.filter(
      (room, index) =>
        rooms.findIndex(({ encoded }) => encoded === room.encoded) === index,
    ),
  )
}

/**
 * The encoded config as this version writes it. A room saved by an older
 * version opens under today's encoding (the address is rewritten to it),
 * so its entry is upgraded too, or opening it again would list it twice.
 * Rooms this version can't open are kept as they are.
 */
function asWrittenToday(encoded: EncodedConfig): EncodedConfig {
  const { config, problem } = decodeConfig(encoded)
  return problem ? encoded : encodeConfig(config)
}

/** A recent room this version can open, with a short name for the list. */
export type DescribedRecentRoom = RecentRoom & { label: string }

/** What the recent rooms list shows. */
export type RecentRoomsSummary = {
  /** The rooms this version can open, newest first. */
  rooms: DescribedRecentRoom[]
  /** How many rooms saved by a newer version of the app are left out. */
  hiddenNewer: number
}

/**
 * The rooms to list, each named by its size in its own units and its
 * layout, such as "6 m × 4.5 m × 2.6 m · 5.1.2", and how many rooms saved
 * by a newer version are left out.
 */
export function summarizeRecentRooms(
  rooms: readonly RecentRoom[],
): RecentRoomsSummary {
  const summary: RecentRoomsSummary = { rooms: [], hiddenNewer: 0 }
  for (const room of rooms) {
    const { config, problem } = decodeConfig(room.encoded)
    if (problem === 'newer-version') summary.hiddenNewer += 1
    else if (!problem) summary.rooms.push({ ...room, label: describe(config) })
  }
  return summary
}

function describe({ room, units, layout }: Config): string {
  const size = [room.length, room.width, room.height]
    .map((meters) => formatLength(meters, units))
    .join(' × ')
  return `${size} · ${formatLayout(layout)}`
}

/**
 * The rooms within the limits, in order: the first RECENT_ROOMS_LIMIT this
 * version can open and the first NEWER_ROOMS_LIMIT from a newer version;
 * damaged entries are dropped.
 */
function withinLimits(rooms: readonly RecentRoom[]): RecentRoom[] {
  let openable = 0
  let newer = 0
  return rooms.filter(({ encoded }) => {
    const { problem } = decodeConfig(encoded)
    if (!problem) return ++openable <= RECENT_ROOMS_LIMIT
    if (problem === 'newer-version') return ++newer <= NEWER_ROOMS_LIMIT
    return false
  })
}
