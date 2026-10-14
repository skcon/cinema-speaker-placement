import { compressToEncodedURIComponent } from 'lz-string'
import { describe, expect, it } from 'vitest'
import { IMPERIAL_ROOM, V1_LINKS } from '@/test/share-link-fixtures'
import { DEFAULT_CONFIG } from './config'
import {
  describeRecentRoom,
  parseRecentRooms,
  RECENT_ROOMS_LIMIT,
  removeRecentRoom,
  saveRecentRoom,
  serializeRecentRooms,
  type RecentRoom,
} from './recent-rooms'
import { encodeConfig } from './share-link'

const A: RecentRoom = { encoded: 'a', savedAt: 1 }
const B: RecentRoom = { encoded: 'b', savedAt: 2 }
const C: RecentRoom = { encoded: 'c', savedAt: 3 }

/** `count` rooms, newest first: r0 saved last. */
function roomsOf(count: number): RecentRoom[] {
  return Array.from({ length: count }, (_, index) => ({
    encoded: `r${index}`,
    savedAt: 100 - index,
  }))
}

describe('saving a recent room', () => {
  it('puts it first, newest first', () => {
    expect(saveRecentRoom([A], { encoded: 'b', savedAt: 2 })).toEqual([B, A])
  })

  it('keeps one entry per encoded config, moved to the front with the new time', () => {
    expect(saveRecentRoom([B, A], { encoded: 'a', savedAt: 5 })).toEqual([
      { encoded: 'a', savedAt: 5 },
      B,
    ])
  })

  it('keeps the last 10 rooms, dropping the oldest', () => {
    expect(RECENT_ROOMS_LIMIT).toBe(10)
    const rooms = saveRecentRoom(roomsOf(10), { encoded: 'new', savedAt: 200 })

    expect(rooms).toHaveLength(10)
    expect(rooms[0]?.encoded).toBe('new')
    expect(rooms.map((room) => room.encoded)).not.toContain('r9')
  })

  it('replaces the entry it was edited from, so editing a room keeps one entry', () => {
    expect(
      saveRecentRoom([B, A, C], { encoded: 'b2', savedAt: 9 }, 'a'),
    ).toEqual([{ encoded: 'b2', savedAt: 9 }, B, C])
  })

  it('just adds it when the entry it replaces is gone', () => {
    expect(saveRecentRoom([A], { encoded: 'b', savedAt: 2 }, 'gone')).toEqual([
      B,
      A,
    ])
  })
})

describe('removing a recent room', () => {
  it('drops its entry and keeps the order of the rest', () => {
    expect(removeRecentRoom([C, B, A], 'b')).toEqual([C, A])
  })

  it('leaves the list as it is when the room is not in it', () => {
    expect(removeRecentRoom([B, A], 'gone')).toEqual([B, A])
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
      { encoded: 'x' },
      { encoded: '', savedAt: 1 },
      { encoded: 'y', savedAt: 'yesterday' },
      { encoded: 'z', savedAt: null },
      A,
    ])

    expect(parseRecentRooms(stored)).toEqual([C, A])
  })

  it('keeps only the fields it knows', () => {
    const stored = JSON.stringify([{ ...A, extra: true }])

    expect(parseRecentRooms(stored)).toEqual([A])
  })

  it('keeps the first entry of a repeated encoded config and at most 10', () => {
    const stored = JSON.stringify([
      B,
      { encoded: 'b', savedAt: 0 },
      ...roomsOf(12),
    ])

    const rooms = parseRecentRooms(stored)

    expect(rooms).toHaveLength(10)
    expect(rooms.filter(({ encoded }) => encoded === 'b')).toEqual([B])
  })
})

describe('describing a recent room', () => {
  it('names the default room by its size in meters and its layout', () => {
    expect(describeRecentRoom(encodeConfig(DEFAULT_CONFIG))).toBe(
      '6 × 4.5 × 2.6 m · 5.1.2',
    )
  })

  it('names an imperial room in feet, with inches only where there are some', () => {
    expect(describeRecentRoom(V1_LINKS.imperialRoom.encoded)).toBe(
      '24 ft × 15 ft × 9 ft · 7.2.2',
    )
    expect(describeRecentRoom(encodeConfig(IMPERIAL_ROOM))).toBe(
      '26 ft 3 in × 16 ft 4.9 in × 9 ft 10.1 in · 7.2.4',
    )
  })

  it('has no name for an encoded config that no longer opens', () => {
    expect(describeRecentRoom('not-a-share-link')).toBeNull()
    expect(
      describeRecentRoom(
        compressToEncodedURIComponent(
          JSON.stringify({ v: 999, config: DEFAULT_CONFIG }),
        ),
      ),
    ).toBeNull()
  })
})
