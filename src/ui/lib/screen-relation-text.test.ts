import { describe, expect, it } from 'vitest'
import { screenRelationNote } from '@/ui/lib/screen-relation-text'

describe('the screen note', () => {
  it('explains a clamp to the minimum: Dolby wins, and the speaker stands beside the screen', () => {
    expect(
      screenRelationNote('Left', {
        kind: 'clamped',
        limit: 'min',
        screenAngle: 16.9,
        dolbyAngle: 22,
        behindScreen: false,
      }),
    ).toBe(
      "Kept inside Dolby's range: the screen's edge would put Left at 17°, below Dolby's 22° minimum, so Left sits at 22°, beside the screen.",
    )
  })

  it('explains a clamp to the maximum, in front of or behind the image', () => {
    const clamped = {
      kind: 'clamped',
      limit: 'max',
      screenAngle: 40.4,
      dolbyAngle: 30,
    } as const
    expect(
      screenRelationNote('Right', { ...clamped, behindScreen: false }),
    ).toMatch(/at 40°, beyond Dolby's 30° maximum, .* in front of the image\.$/)
    expect(
      screenRelationNote('Right', { ...clamped, behindScreen: true }),
    ).toMatch(/behind the image\.$/)
  })

  it('names where the Center is', () => {
    expect(screenRelationNote('Center', { kind: 'below' })).toBe(
      'Center sits just below the screen, nearer ear height than above it.',
    )
    expect(screenRelationNote('Center', { kind: 'behind' })).toMatch(
      /behind the acoustically transparent screen/,
    )
  })
})
