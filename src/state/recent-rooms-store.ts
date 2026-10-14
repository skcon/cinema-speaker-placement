import { createStore } from 'zustand/vanilla'
import {
  DEFAULT_CONFIG,
  encodeConfig,
  parseRecentRooms,
  removeRecentRoom,
  saveRecentRoom,
  serializeRecentRooms,
  type EncodedConfig,
  type RecentRoom,
} from '@/domain'
import {
  recentRoomsStorage,
  type KeyValueStorage,
  type RecentRoomsStorage,
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
  save: (encoded: EncodedConfig, replacing?: EncodedConfig) => void
  /** Removes the recent room an encoded config holds. */
  remove: (encoded: EncodedConfig) => void
  /** Removes every recent room. */
  clear: () => void
  /**
   * Reads the rooms from storage again, after another tab changed them.
   * Only reads, so two tabs never write repairs back and forth.
   */
  reload: () => void
}

export type RecentRoomsStore = ReturnType<typeof createRecentRoomsStore>

const DEFAULT_ENCODED = encodeConfig(DEFAULT_CONFIG)

/**
 * The recent rooms of this browser, kept in browser storage (ADR 0001: a
 * per-browser convenience). Storage is read again before each change, so
 * rooms other tabs saved are kept. Damaged stored text is ignored, and
 * written back cleaned up when the store starts. Without working storage
 * (blocked, full) the rooms are kept for this visit only.
 */
export function createRecentRoomsStore({
  storage: getStorage,
  now = Date.now,
}: {
  storage: () => KeyValueStorage
  now?: () => number
}) {
  const storage = recentRoomsStorage(getStorage)

  return createStore<RecentRoomsState>()((set) => {
    function updateRooms(edit: (rooms: RecentRoom[]) => RecentRoom[]) {
      const rooms = edit(parseRecentRooms(storage.read()))
      writeRooms(storage, rooms)
      set({ rooms })
    }
    return {
      rooms: readRepaired(storage),
      save: (encoded, replacing) => {
        if (encoded === DEFAULT_ENCODED) return
        updateRooms((rooms) =>
          saveRecentRoom(rooms, { encoded, savedAt: now() }, replacing),
        )
      },
      remove: (encoded) =>
        updateRooms((rooms) => removeRecentRoom(rooms, encoded)),
      clear: () => updateRooms(() => []),
      reload: () => set({ rooms: parseRecentRooms(storage.read()) }),
    }
  })
}

/** The stored recent rooms, writing them back if the stored text was damaged. */
function readRepaired(storage: RecentRoomsStorage): RecentRoom[] {
  const text = storage.read()
  const rooms = parseRecentRooms(text)
  if (text !== storedText(rooms)) writeRooms(storage, rooms)
  return rooms
}

/** Stores `rooms`, removing the stored text when there are none. */
function writeRooms(storage: RecentRoomsStorage, rooms: readonly RecentRoom[]) {
  storage.write(storedText(rooms))
}

function storedText(rooms: readonly RecentRoom[]): string | null {
  return rooms.length > 0 ? serializeRecentRooms(rooms) : null
}
