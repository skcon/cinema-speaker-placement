/**
 * The one place the app touches browser storage: the recent rooms text,
 * read and written without ever throwing (issue #2: the app works without
 * storage).
 */

/** Where recent rooms are kept in browser storage. */
export const RECENT_ROOMS_STORAGE_KEY = 'cinema-speaker-placement:recent-rooms'

/** The part of the Web Storage API (localStorage) the recent rooms use. */
export type KeyValueStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

/** Reads and writes the stored recent rooms text; null is none. */
export type RecentRoomsStorage = {
  read: () => string | null
  write: (text: string | null) => void
}

/**
 * The recent rooms text in `storage`, which is called on every access,
 * since even reaching localStorage can throw (blocked site data). Once
 * reading or writing fails (blocked, full), the text lives in memory for
 * the rest of this visit instead.
 */
export function recentRoomsStorage(
  storage: () => KeyValueStorage,
): RecentRoomsStorage {
  let fallback: { text: string | null } | null = null
  return {
    read: () => {
      if (fallback) return fallback.text
      try {
        return storage().getItem(RECENT_ROOMS_STORAGE_KEY)
      } catch {
        fallback = { text: null }
        return null
      }
    },
    write: (text) => {
      if (!fallback) {
        try {
          if (text === null) storage().removeItem(RECENT_ROOMS_STORAGE_KEY)
          else storage().setItem(RECENT_ROOMS_STORAGE_KEY, text)
          return
        } catch {
          // Blocked or full: keep the rooms in memory instead.
        }
      }
      fallback = { text }
    },
  }
}
