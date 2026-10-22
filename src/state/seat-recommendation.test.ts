import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type Config } from '@/domain'
import { seatScoreKey } from '@/state/seat-recommendation'

describe('the seat score memo key', () => {
  const key = seatScoreKey(DEFAULT_CONFIG)

  it('ignores the units and the seat row size, which the score does not depend on', () => {
    expect(seatScoreKey({ ...DEFAULT_CONFIG, units: 'imperial' })).toBe(key)
    expect(
      seatScoreKey({
        ...DEFAULT_CONFIG,
        roomObjects: {
          ...DEFAULT_CONFIG.roomObjects,
          seatRow: { width: 3, depth: 1.2 },
        },
      }),
    ).toBe(key)
  })

  it('changes with another room object, which a later auto-place may use', () => {
    const withScreen: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: {
        ...DEFAULT_CONFIG.roomObjects,
        screen: {
          kind: 'tv',
          width: 1.44,
          height: 0.81,
          bottomEdge: 0.93,
          x: 0,
          standoff: null,
        },
      },
    }

    expect(seatScoreKey(withScreen)).not.toBe(key)
  })

  it.each([
    ['the room', { room: { length: 7, width: 4.5, height: 2.6 } }],
    ['the layout', { layout: { dolbyLayout: '7.1', subwoofers: 2 } }],
    ['the target curve', { targetCurve: 'house' }],
    ['the crossover', { crossoverHz: 100 }],
    [
      'a manual subwoofer',
      { manualPositions: { Sub1: { x: 1.5, y: 3, z: 0.3 } } },
    ],
  ] as const)('changes with %s', (_, change) => {
    expect(seatScoreKey({ ...DEFAULT_CONFIG, ...change })).not.toBe(key)
  })

  it.each([
    ['the MLP', { MLP: { x: 0, y: 3, z: 1.2 } }],
    ['a listener-level speaker', { L: { x: -1.8, y: 0.5, z: 1.2 } }],
    ['an overhead speaker', { Ltm: { x: -1, y: 2, z: 2.6 } }],
  ] as const)(
    'ignores %s moved by hand, which the recommended seat does not read (#120)',
    (_, manualPositions) => {
      expect(seatScoreKey({ ...DEFAULT_CONFIG, manualPositions })).toBe(key)
    },
  )

  it('changes with any other field, even one added later (a blocklist, not an allowlist)', () => {
    const withNewField = { ...DEFAULT_CONFIG, ampWatts: 100 } as Config

    expect(seatScoreKey(withNewField)).not.toBe(key)
  })
})
