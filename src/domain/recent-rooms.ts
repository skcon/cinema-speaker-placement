/**
 * Recent rooms: the encoded configs of rooms worked on in this browser,
 * newest first (ADR 0001: a per-browser convenience; the share link stays
 * the save feature). Pure list logic; reading and writing browser storage
 * is the state layer's job.
 */

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
