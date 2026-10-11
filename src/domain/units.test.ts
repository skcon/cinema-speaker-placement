import { describe, expect, it } from 'vitest'
import { formatLength, UNIT_SYSTEMS, type Rounding } from '@/domain'

const { metric, imperial } = UNIT_SYSTEMS

/** Every value from `from` to `to` (inclusive) in steps of `step`. */
function range(from: number, to: number, step: number): number[] {
  const count = Math.round((to - from) / step)
  return Array.from({ length: count + 1 }, (_, i) => from + i * step)
}

/** The part values a system shows for a length, e.g. [19, 8.2] for 19 ft 8.2 in. */
function shown(
  system: (typeof UNIT_SYSTEMS)[keyof typeof UNIT_SYSTEMS],
  meters: number,
  rounding?: Rounding,
): number[] {
  return system.toParts(meters, rounding).map(({ value }) => value)
}

describe('the metric system', () => {
  it('writes a length as one part, in meters', () => {
    expect(metric.parts).toEqual(['m'])
    expect(metric.toParts(4.5)).toEqual([{ unit: 'm', value: 4.5 }])
  })

  it('rounds to the nearest centimeter', () => {
    expect(shown(metric, 4.567)).toEqual([4.57])
    // 19 ft 8.2 in = 5.99948 m
    expect(shown(metric, 5.99948)).toEqual([6])
    expect(shown(metric, 2.6)).toEqual([2.6])
  })

  it('reads meters back unchanged', () => {
    expect(metric.fromParts([4.5])).toBe(4.5)
  })

  it('has the meter as its base unit', () => {
    expect(metric.baseUnit).toEqual({ unit: 'm', meters: 1 })
  })
})

describe('the imperial system', () => {
  it('writes a length as feet and inches', () => {
    expect(imperial.parts).toEqual(['ft', 'in'])
    expect(imperial.toParts(6)).toEqual([
      { unit: 'ft', value: 19 },
      { unit: 'in', value: 8.2 },
    ])
  })

  it('uses the exact international foot and inch', () => {
    expect(imperial.fromParts([1, 0])).toBeCloseTo(0.3048, 12)
    expect(imperial.fromParts([0, 1])).toBeCloseTo(0.0254, 12)
  })

  it('adds the inches to the feet', () => {
    // 19 ft 8.2 in = 236.2 in = 5.99948 m
    expect(imperial.fromParts([19, 8.2])).toBeCloseTo(5.99948, 9)
  })

  it('splits a length into whole feet and inches to the nearest 0.1 in', () => {
    expect(shown(imperial, 0.3048)).toEqual([1, 0])
    // 6 m = 236.22 in; 4.5 m = 177.17 in; 2.6 m = 102.36 in
    expect(shown(imperial, 6)).toEqual([19, 8.2])
    expect(shown(imperial, 4.5)).toEqual([14, 9.2])
    expect(shown(imperial, 2.6)).toEqual([8, 6.4])
  })

  it('carries rounded-up inches into the next foot', () => {
    // 0.3047 m = 11.996 in, which rounds to 12.0 in = 1 ft 0 in
    expect(shown(imperial, 0.3047)).toEqual([1, 0])
  })

  it('round-trips every feet + inches value on the 0.1 in grid from 2 to 15 m', () => {
    // 2 m = 78.7 in, 15 m = 590.6 in
    for (const tenths of range(788, 5905, 1)) {
      const parts = [Math.floor(tenths / 120), (tenths % 120) / 10]
      expect(shown(imperial, imperial.fromParts(parts))).toEqual(parts)
    }
  })

  it('round-trips meters from 2 to 15 m to within half the 0.1 in display step', () => {
    for (const meters of range(2, 15, 0.001)) {
      const back = imperial.fromParts(shown(imperial, meters))
      // 0.05 in = 1.27 mm
      expect(Math.abs(back - meters)).toBeLessThanOrEqual(0.00127 + 1e-12)
    }
  })

  it('has the foot as its base unit', () => {
    expect(imperial.baseUnit).toEqual({ unit: 'ft', meters: 0.3048 })
  })
})

describe('directed rounding', () => {
  it('never lands below the value when rounding up, or above it when rounding down', () => {
    for (const meters of range(2, 15, 0.001)) {
      for (const system of [metric, imperial]) {
        const up = system.fromParts(shown(system, meters, 'up'))
        const down = system.fromParts(shown(system, meters, 'down'))
        expect(up).toBeGreaterThanOrEqual(meters - 1e-9)
        expect(down).toBeLessThanOrEqual(meters + 1e-9)
      }
    }
  })
})

describe('formatting a length for the chosen units', () => {
  it('writes metric lengths in meters to the nearest centimeter', () => {
    expect(formatLength(2, 'metric')).toBe('2 m')
    expect(formatLength(4.5, 'metric')).toBe('4.5 m')
    expect(formatLength(5.99948, 'metric')).toBe('6 m')
  })

  it('writes imperial lengths as feet and inches', () => {
    // 2 m = 78.74 in; 15 m = 590.55 in
    expect(formatLength(2, 'imperial')).toBe('6 ft 6.7 in')
    expect(formatLength(15, 'imperial')).toBe('49 ft 2.6 in')
    expect(formatLength(0.3048, 'imperial')).toBe('1 ft 0 in')
  })

  it('can round up or down, so a shown limit is itself inside the range', () => {
    // 2 m = 78.74 in: 78.7 in would be below a 2 m minimum
    expect(formatLength(2, 'imperial', 'up')).toBe('6 ft 6.8 in')
    // 15 m = 590.55 in: 590.6 in would be above a 15 m maximum
    expect(formatLength(15, 'imperial', 'down')).toBe('49 ft 2.5 in')
    expect(formatLength(2.004, 'metric', 'up')).toBe('2.01 m')
    expect(formatLength(14.996, 'metric', 'down')).toBe('14.99 m')
  })

  it('leaves values already on the display step alone when rounding up or down', () => {
    expect(formatLength(0.3048, 'imperial', 'up')).toBe('1 ft 0 in')
    expect(formatLength(0.3048, 'imperial', 'down')).toBe('1 ft 0 in')
    expect(formatLength(2, 'metric', 'up')).toBe('2 m')
    expect(formatLength(15, 'metric', 'down')).toBe('15 m')
  })
})
