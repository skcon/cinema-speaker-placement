import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, encodeConfig } from '@/domain'
import { IMPERIAL_ROOM, V1_LINKS } from '@/test/share-link-fixtures'
import {
  createRecentRoomsStore,
  RECENT_ROOMS_STORAGE_KEY,
  type KeyValueStorage,
} from '@/state/recent-rooms-store'

const ROOM_A = V1_LINKS.imperialRoom.encoded
const ROOM_B = encodeConfig(IMPERIAL_ROOM)

/** A storage like localStorage, holding `stored` under the recent-rooms key. */
function memoryStorage(stored?: string) {
  const items = new Map<string, string>()
  if (stored !== undefined) items.set(RECENT_ROOMS_STORAGE_KEY, stored)
  const storage: KeyValueStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
  return { storage, stored: () => items.get(RECENT_ROOMS_STORAGE_KEY) }
}

/** A storage that throws on every call, as a blocked or full one does. */
const throwingStorage: KeyValueStorage = {
  getItem: () => {
    throw new DOMException('Blocked', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('Full', 'QuotaExceededError')
  },
  removeItem: () => {
    throw new DOMException('Blocked', 'SecurityError')
  },
}

function storeWith(storage: KeyValueStorage | (() => KeyValueStorage)) {
  let time = 1000
  return createRecentRoomsStore({
    storage: typeof storage === 'function' ? storage : () => storage,
    now: () => (time += 1000),
  })
}

describe('recent rooms store', () => {
  it('starts with no rooms when nothing is stored', () => {
    const store = storeWith(memoryStorage().storage)

    expect(store.getState().rooms).toEqual([])
  })

  it('saves a room newest first, with the time, and stores it', () => {
    const { storage, stored } = memoryStorage()
    const store = storeWith(storage)

    store.getState().save(ROOM_A)
    store.getState().save(ROOM_B)

    const rooms = [
      { encoded: ROOM_B, savedAt: 3000 },
      { encoded: ROOM_A, savedAt: 2000 },
    ]
    expect(store.getState().rooms).toEqual(rooms)
    expect(JSON.parse(stored() ?? '')).toEqual(rooms)
  })

  it('starts from the rooms stored by an earlier visit', () => {
    const first = memoryStorage()
    storeWith(first.storage).getState().save(ROOM_A)

    const store = storeWith(memoryStorage(first.stored()).storage)

    expect(store.getState().rooms).toEqual([{ encoded: ROOM_A, savedAt: 2000 }])
  })

  it('picks up rooms another tab saved before it saves', () => {
    const { storage, stored } = memoryStorage()
    const store = storeWith(storage)
    const otherTab = storeWith(storage)

    otherTab.getState().save(ROOM_A)
    store.getState().save(ROOM_B)

    expect(store.getState().rooms.map(({ encoded }) => encoded)).toEqual([
      ROOM_B,
      ROOM_A,
    ])
    expect(parseStored(stored())).toEqual([ROOM_B, ROOM_A])
  })

  it.each([
    ['damaged text', '{not json'],
    ['something else', '{"rooms":[]}'],
  ])('ignores %s in storage and clears it', (_, text) => {
    const { storage, stored } = memoryStorage(text)

    const store = storeWith(storage)

    expect(store.getState().rooms).toEqual([])
    expect(stored()).toBeUndefined()
  })

  it('drops damaged entries from storage and keeps the good ones', () => {
    const good = { encoded: ROOM_A, savedAt: 5 }
    const { storage, stored } = memoryStorage(
      JSON.stringify([good, { encoded: 7 }, good]),
    )

    const store = storeWith(storage)

    expect(store.getState().rooms).toEqual([good])
    expect(JSON.parse(stored() ?? '')).toEqual([good])
  })

  it('removes a room and stores the rest', () => {
    const { storage, stored } = memoryStorage()
    const store = storeWith(storage)
    store.getState().save(ROOM_A)
    store.getState().save(ROOM_B)

    store.getState().remove(ROOM_A)

    expect(store.getState().rooms.map(({ encoded }) => encoded)).toEqual([
      ROOM_B,
    ])
    expect(parseStored(stored())).toEqual([ROOM_B])
  })

  it('clears every room, from storage too', () => {
    const { storage, stored } = memoryStorage()
    const store = storeWith(storage)
    store.getState().save(ROOM_A)

    store.getState().clear()

    expect(store.getState().rooms).toEqual([])
    expect(stored()).toBeUndefined()
  })

  it('does not save the untouched default room', () => {
    const store = storeWith(memoryStorage().storage)

    store.getState().save(encodeConfig(DEFAULT_CONFIG))

    expect(store.getState().rooms).toEqual([])
  })

  it('shows the rooms another tab saved when asked to reload', () => {
    const { storage } = memoryStorage()
    const store = storeWith(storage)
    storeWith(storage).getState().save(ROOM_A)

    store.getState().reload()

    expect(store.getState().rooms.map(({ encoded }) => encoded)).toEqual([
      ROOM_A,
    ])
  })

  describe('without storage', () => {
    it.each([
      ['storage that throws', () => throwingStorage],
      [
        'no way to reach storage',
        () => {
          throw new DOMException('Blocked', 'SecurityError')
        },
      ],
    ])('works with %s, keeping rooms for this visit', (_, storage) => {
      const store = storeWith(storage)

      expect(store.getState().rooms).toEqual([])
      store.getState().save(ROOM_A)
      store.getState().save(ROOM_B, ROOM_A)
      store.getState().save(ROOM_A)
      store.getState().reload()

      expect(store.getState().rooms.map(({ encoded }) => encoded)).toEqual([
        ROOM_A,
        ROOM_B,
      ])
      store.getState().remove(ROOM_B)
      expect(store.getState().rooms).toHaveLength(1)
      store.getState().clear()
      expect(store.getState().rooms).toEqual([])
    })
  })
})

/** The encoded configs in stored text, in order. */
function parseStored(text: string | undefined): string[] {
  return (JSON.parse(text ?? '[]') as { encoded: string }[]).map(
    ({ encoded }) => encoded,
  )
}
