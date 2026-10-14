/**
 * Recent rooms: the encoded configs of rooms worked on in this browser,
 * newest first (ADR 0001: a per-browser convenience; the share link stays
 * the save feature). Pure list logic; reading and writing browser storage
 * is the state layer's job.
 */
import { z } from 'zod'
import type { Config } from './config'
import { formatLayout } from './layout'
import { decodeConfig } from './share-link'
import { UNIT_SYSTEMS } from './units'

/** A room worked on in this browser: its encoded config and when it was saved. */
export type RecentRoom = {
  /** The encoded config, as a share link's `config` search param holds it. */
  encoded: string
  /** When it was last saved, in milliseconds since the epoch. */
  savedAt: number
}

/** How many recent rooms are kept; saving another drops the oldest. */
export const RECENT_ROOMS_LIMIT = 10

/**
 * The list with `room` first, newest first: one entry per encoded config,
 * at most RECENT_ROOMS_LIMIT. `replacing` is the encoded config of the
 * entry `room` was edited from, which it takes the place of, so editing a
 * room keeps one entry for it rather than one per edit.
 */
export function saveRecentRoom(
  rooms: readonly RecentRoom[],
  room: RecentRoom,
  replacing?: string,
): RecentRoom[] {
  const others = rooms.filter(
    ({ encoded }) => encoded !== room.encoded && encoded !== replacing,
  )
  return [room, ...others].slice(0, RECENT_ROOMS_LIMIT)
}

/** The list without the entry for `encoded`. */
export function removeRecentRoom(
  rooms: readonly RecentRoom[],
  encoded: string,
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
 * the app, so anything that isn't a recent room is skipped, and repeats and
 * entries past the limit are dropped. Whether an entry's encoded config
 * still opens is left to describeRecentRoom.
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
  return json
    .flatMap((entry) => {
      const result = recentRoomSchema.safeParse(entry)
      return result.success ? [result.data] : []
    })
    .filter(
      (room, index, rooms) =>
        rooms.findIndex(({ encoded }) => encoded === room.encoded) === index,
    )
    .slice(0, RECENT_ROOMS_LIMIT)
}

/**
 * A short name for a recent room, from its encoded config: its size in its
 * own units and its layout, such as "6 × 4.5 × 2.6 m · 5.1.2" or
 * "24 ft × 15 ft 6 in × 9 ft · 7.2.4". Null when the encoded config no
 * longer opens (damaged, or saved by a newer version of the app), so the
 * list can leave it out instead of opening the default room.
 */
export function describeRecentRoom(encoded: string): string | null {
  const { config, problem } = decodeConfig(encoded)
  if (problem) return null
  return `${describeSize(config)} · ${formatLayout(config.layout)}`
}

function describeSize({ room, units }: Config): string {
  const sides = [room.length, room.width, room.height].map((meters) =>
    UNIT_SYSTEMS[units].toParts(meters, 'nearest'),
  )
  if (units === 'metric') {
    return `${sides.map((parts) => parts.map(({ value }) => value).join(' ')).join(' × ')} m`
  }
  return sides
    .map((parts) =>
      parts
        .filter(({ unit, value }) => unit !== 'in' || value !== 0)
        .map(({ unit, value }) => `${value} ${unit}`)
        .join(' '),
    )
    .join(' × ')
}
