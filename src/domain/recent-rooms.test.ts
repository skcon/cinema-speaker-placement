import { compressToEncodedURIComponent } from 'lz-string'
import { describe, expect, it } from 'vitest'
import { IMPERIAL_ROOM, V1_LINKS, V2_LINKS } from '@/test/share-link-fixtures'
import { DEFAULT_CONFIG } from './config'
import {
  parseRecentRooms,
  RECENT_ROOMS_LIMIT,
  removeRecentRoom,
  saveRecentRoom,
  serializeRecentRooms,
  summarizeRecentRooms,
  type RecentRoom,
} from './recent-rooms'
import { DEFAULT_ROOM } from './room'
import { encodeConfig, type EncodedConfig } from './share-link'

/** The encoded config of the default room, `length` meters long. */
function roomOf(length: number): EncodedConfig {
  return encodeConfig({
    ...DEFAULT_CONFIG,
    room: { ...DEFAULT_ROOM, length },
  })
}

/** An encoded config written by a newer version of the app (`v` 99). */
function newerRoom(id: number): EncodedConfig {
  return compressToEncodedURIComponent(
    JSON.stringify({ v: 99, config: { id } }),
  ) as EncodedConfig
}

const A: RecentRoom = { encoded: roomOf(3), savedAt: 1 }
const B: RecentRoom = { encoded: roomOf(4), savedAt: 2 }
const C: RecentRoom = { encoded: roomOf(5), savedAt: 3 }

/** `count` openable rooms, newest first. */
function roomsOf(count: number): RecentRoom[] {
  return Array.from({ length: count }, (_, index) => ({
    encoded: roomOf(3 + index / 10),
    savedAt: 100 - index,
  }))
}

/** `count` rooms from a newer version, newest first. */
function newerRoomsOf(count: number): RecentRoom[] {
  return Array.from({ length: count }, (_, index) => ({
    encoded: newerRoom(index),
    savedAt: 50 - index,
  }))
}

describe('saving a recent room', () => {
  it('puts it first, newest first', () => {
    expect(saveRecentRoom([A], B)).toEqual([B, A])
  })

  it('keeps one entry per encoded config, moved to the front with the new time', () => {
    const again = { encoded: A.encoded, savedAt: 5 }

    expect(saveRecentRoom([B, A], again)).toEqual([again, B])
  })

  it('keeps the last 10 rooms, dropping the oldest', () => {
    expect(RECENT_ROOMS_LIMIT).toBe(10)
    const old = roomsOf(10)

    const rooms = saveRecentRoom(old, C)

    expect(rooms).toHaveLength(10)
    expect(rooms[0]).toEqual(C)
    expect(rooms).not.toContainEqual(old[9])
  })

  it('replaces the entry it was edited from, so editing a room keeps one entry', () => {
    expect(saveRecentRoom([B, A, C], { ...B, savedAt: 9 }, A.encoded)).toEqual([
      { ...B, savedAt: 9 },
      C,
    ])
  })

  it('just adds it when the entry it replaces is gone', () => {
    expect(saveRecentRoom([A], B, C.encoded)).toEqual([B, A])
  })

  it('keeps 10 openable rooms however many rooms from a newer version there are', () => {
    const rooms = saveRecentRoom([...newerRoomsOf(3), ...roomsOf(10)], C)

    expect(summarizeRecentRooms(rooms).rooms).toHaveLength(10)
  })

  it('keeps at most 5 rooms from a newer version, the newest', () => {
    const newer = newerRoomsOf(7)

    const rooms = saveRecentRoom(newer, A)

    expect(rooms).toEqual([A, ...newer.slice(0, 5)])
  })
})

describe('removing a recent room', () => {
  it('drops its entry and keeps the order of the rest', () => {
    expect(removeRecentRoom([C, B, A], B.encoded)).toEqual([C, A])
  })

  it('leaves the list as it is when the room is not in it', () => {
    expect(removeRecentRoom([B, A], C.encoded)).toEqual([B, A])
  })
})

describe('reading stored recent rooms', () => {
  it('reads back what was stored', () => {
    expect(parseRecentRooms(serializeRecentRooms([C, B, A]))).toEqual([C, B, A])
  })

  it('reads nothing stored as no rooms', () => {
    expect(parseRecentRooms(null)).toEqual([])
  })

  it.each([
    ['not JSON', '{not json'],
    ['not a list', '{"encoded":"a","savedAt":1}'],
    ['a number', '42'],
    ['JSON null', 'null'],
  ])('reads %s as no rooms', (_, stored) => {
    expect(parseRecentRooms(stored)).toEqual([])
  })

  it('skips entries that are not recent rooms and keeps the good ones', () => {
    const stored = JSON.stringify([
      C,
      null,
      'b',
      { encoded: 42, savedAt: 1 },
      { encoded: B.encoded },
      { encoded: '', savedAt: 1 },
      { encoded: B.encoded, savedAt: 'yesterday' },
      { encoded: 'damaged-link', savedAt: 4 },
      A,
    ])

    expect(parseRecentRooms(stored)).toEqual([C, A])
  })

  it('keeps rooms from a newer version, for the tab that saved them', () => {
    const [newer] = newerRoomsOf(1)

    expect(parseRecentRooms(JSON.stringify([newer, A]))).toEqual([newer, A])
  })

  it('keeps only the fields it knows', () => {
    const stored = JSON.stringify([{ ...A, extra: true }])

    expect(parseRecentRooms(stored)).toEqual([A])
  })

  it('reads a room saved by an older version as the app writes it today, so opening it again keeps one entry', () => {
    const { encoded } = V1_LINKS.imperialRoom
    // The same room as today's version writes it.
    const today = V2_LINKS.imperialRoom.encoded as EncodedConfig
    // Opened again from a link: saved once more, as today's version writes it.
    const stored = serializeRecentRooms([
      { encoded: today, savedAt: 2 },
      { encoded: encoded as EncodedConfig, savedAt: 1 },
    ])

    expect(parseRecentRooms(stored)).toEqual([{ encoded: today, savedAt: 2 }])
  })

  it('keeps the first entry of a repeated encoded config, 10 openable rooms and 5 newer ones', () => {
    const stored = JSON.stringify([
      B,
      { ...B, savedAt: 0 },
      ...newerRoomsOf(7),
      ...roomsOf(12),
    ])

    const rooms = parseRecentRooms(stored)

    expect(rooms.filter(({ encoded }) => encoded === B.encoded)).toEqual([B])
    expect(summarizeRecentRooms(rooms)).toMatchObject({ hiddenNewer: 5 })
    expect(summarizeRecentRooms(rooms).rooms).toHaveLength(10)
  })
})

describe('summarizing recent rooms', () => {
  it('names the default room by its size in meters and its layout', () => {
    const room = { encoded: encodeConfig(DEFAULT_CONFIG), savedAt: 7 }

    expect(summarizeRecentRooms([room])).toEqual({
      rooms: [{ ...room, label: '6 m × 4.5 m × 2.6 m · 5.1.2' }],
      hiddenNewer: 0,
    })
  })

  it('names an imperial room in feet and inches', () => {
    const rooms = [
      { encoded: V1_LINKS.imperialRoom.encoded as EncodedConfig, savedAt: 2 },
      { encoded: encodeConfig(IMPERIAL_ROOM), savedAt: 1 },
    ]

    expect(summarizeRecentRooms(rooms).rooms.map(({ label }) => label)).toEqual(
      [
        '24 ft 0 in × 15 ft 0 in × 9 ft 0 in · 7.2.2',
        '26 ft 3 in × 16 ft 4.9 in × 9 ft 10.1 in · 7.2.4',
      ],
    )
  })

  it('hides rooms from a newer version and counts them', () => {
    const summary = summarizeRecentRooms([...newerRoomsOf(2), A])

    expect(summary.rooms.map(({ encoded }) => encoded)).toEqual([A.encoded])
    expect(summary.hiddenNewer).toBe(2)
  })
})
