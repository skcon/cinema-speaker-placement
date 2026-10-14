import { describe, expect, it } from 'vitest'
import { formatSavedAt } from './saved-at'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const NOW = Date.UTC(2026, 9, 14, 12)

describe('when a recent room was saved', () => {
  it.each([
    [0, 'just now'],
    [59_000, 'just now'],
    [-5000, 'just now'],
    [MINUTE, '1 min ago'],
    [59 * MINUTE, '59 min ago'],
    [HOUR, '1 h ago'],
    [23 * HOUR, '23 h ago'],
    [DAY, 'yesterday'],
    [2 * DAY, '2 days ago'],
    [6 * DAY, '6 days ago'],
  ])('%i ms ago reads "%s"', (ago, text) => {
    expect(formatSavedAt(NOW - ago, NOW)).toBe(text)
  })

  it('gives the date from a week ago', () => {
    expect(formatSavedAt(Date.UTC(2026, 8, 1, 12), NOW)).toBe('Sep 1, 2026')
  })
})
