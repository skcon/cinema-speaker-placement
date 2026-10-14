import { describe, expect, it } from 'vitest'
import {
  RECENT_ROOMS_LIMIT,
  saveRecentRoom,
  type RecentRoom,
} from './recent-rooms'

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
