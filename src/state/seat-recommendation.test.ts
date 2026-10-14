import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type Config } from '@/domain'
import { seatScoreKey } from '@/state/seat-recommendation'

describe('the seat score memo key', () => {
  const key = seatScoreKey(DEFAULT_CONFIG)

  it('ignores the units and the seat row width, which the score does not depend on', () => {
    expect(seatScoreKey({ ...DEFAULT_CONFIG, units: 'imperial' })).toBe(key)
    expect(seatScoreKey({ ...DEFAULT_CONFIG, seatRowWidth: 3 })).toBe(key)
  })

  it.each([
    ['the room', { room: { length: 7, width: 4.5, height: 2.6 } }],
    ['the layout', { layout: { dolbyLayout: '7.1', subwoofers: 2 } }],
    ['the target curve', { targetCurve: 'house' }],
    ['the crossover', { crossoverHz: 100 }],
    ['a manual position', { manualPositions: { MLP: { x: 0, y: 3, z: 1.2 } } }],
  ] as const)('changes with %s', (_, change) => {
    expect(seatScoreKey({ ...DEFAULT_CONFIG, ...change })).not.toBe(key)
  })

  it('changes with any other field, even one added later (a blocklist, not an allowlist)', () => {
    const withNewField = { ...DEFAULT_CONFIG, ampWatts: 100 } as Config

    expect(seatScoreKey(withNewField)).not.toBe(key)
  })
})
