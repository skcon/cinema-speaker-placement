import { createStore } from 'zustand/vanilla'
import {
  DEFAULT_CONFIG,
  encodeConfig,
  parseRecentRooms,
  removeRecentRoom,
  saveRecentRoom,
  serializeRecentRooms,
  type RecentRoom,
} from '@/domain'
import {
  recentRoomsStorage,
  type KeyValueStorage,
  type RecentRoomsStorage,
} from './recent-rooms-storage'

export {
  RECENT_ROOMS_STORAGE_KEY,
  type KeyValueStorage,
} from './recent-rooms-storage'

export type RecentRoomsState = {
  /** The recent rooms, newest first. */
  rooms: RecentRoom[]
  /**
   * Saves the room an encoded config holds as the newest recent room.
   * `replacing` is the encoded config it was edited from, whose entry it
   * takes the place of (see saveRecentRoom). The untouched default room
   * isn't saved: it is what every first visit shows.
   */
  save: (encoded: string, replacing?: string) => void
  /** Removes the recent room an encoded config holds. */
  remove: (encoded: string) => void
  /** Removes every recent room. */
  clear: () => void
  /** Reads the rooms from storage again, after another tab changed them. */
  reload: () => void
}

export type RecentRoomsStore = ReturnType<typeof createRecentRoomsStore>

const DEFAULT_ENCODED = encodeConfig(DEFAULT_CONFIG)

/**
 * The recent rooms of this browser, kept in browser storage (ADR 0001: a
 * per-browser convenience). Storage is read again before each change, so
 * rooms other tabs saved are kept. Damaged stored text is ignored and
 * written back cleaned up. Without working storage (blocked, full) the
 * rooms are kept for this visit only.
 */
export function createRecentRoomsStore({
  storage,
  now = Date.now,
}: {
  storage: () => KeyValueStorage
  now?: () => number
}) {
  const stored = recentRoomsStorage(storage)

  return createStore<RecentRoomsState>()((set) => {
    function change(edit: (rooms: RecentRoom[]) => RecentRoom[]) {
      const rooms = edit(parseRecentRooms(stored.read()))
      stored.write(rooms.length > 0 ? serializeRecentRooms(rooms) : null)
      set({ rooms })
    }
    return {
      rooms: readRepaired(stored),
      save: (encoded, replacing) => {
        if (encoded === DEFAULT_ENCODED) return
        change((rooms) =>
          saveRecentRoom(rooms, { encoded, savedAt: now() }, replacing),
        )
      },
      remove: (encoded) => change((rooms) => removeRecentRoom(rooms, encoded)),
      clear: () => change(() => []),
      reload: () => set({ rooms: readRepaired(stored) }),
    }
  })
}

/** The stored recent rooms, writing them back if the stored text was damaged. */
function readRepaired(stored: RecentRoomsStorage): RecentRoom[] {
  const text = stored.read()
  const rooms = parseRecentRooms(text)
  const repaired = rooms.length > 0 ? serializeRecentRooms(rooms) : null
  if (text !== repaired) stored.write(repaired)
  return rooms
}
