import { describe, expect, it } from 'vitest'
import { crossoverLabel } from '@/charts/format'

describe('crossoverLabel', () => {
  it('names the crossover marker with its frequency', () => {
    expect(crossoverLabel(80)).toBe('Crossover 80 Hz')
    expect(crossoverLabel(120)).toBe('Crossover 120 Hz')
  })
})
