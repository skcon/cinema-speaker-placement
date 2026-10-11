import { describe, expect, it } from 'vitest'
import { checkPlacementRange } from '@/domain'

const FIVE_ONE = '5.1'
const SEVEN_ONE_FOUR = '7.1.4'

describe('placement-range grade of Left and Right', () => {
  // Ideal 22°–30° (per-layout sheets), acceptable to 40° (IG fig.3)
  it.each([
    [22, 'ideal'],
    [30, 'ideal'],
    [31, 'acceptable'],
    [40, 'acceptable'],
    [41, 'outside'],
    [21, 'outside'],
  ] as const)('grades Right at %f° as %s', (azimuth, grade) => {
    expect(checkPlacementRange(FIVE_ONE, 'R', azimuth).grade).toBe(grade)
  })

  it.each([
    [-22, 'ideal'],
    [-30, 'ideal'],
    [-31, 'acceptable'],
    [-40, 'acceptable'],
    [-41, 'outside'],
    [-21, 'outside'],
  ] as const)('grades Left at %f° as %s', (azimuth, grade) => {
    expect(checkPlacementRange(FIVE_ONE, 'L', azimuth).grade).toBe(grade)
  })

  it('uses the same ranges in a layout with overheads', () => {
    expect(checkPlacementRange(SEVEN_ONE_FOUR, 'R', 30).grade).toBe('ideal')
    expect(checkPlacementRange(SEVEN_ONE_FOUR, 'R', 40).grade).toBe(
      'acceptable',
    )
    expect(checkPlacementRange(SEVEN_ONE_FOUR, 'R', 41).grade).toBe('outside')
  })

  it('grades a speaker on the wrong side of the center-front reference as outside', () => {
    expect(checkPlacementRange(FIVE_ONE, 'L', 26).grade).toBe('outside')
    expect(checkPlacementRange(FIVE_ONE, 'R', -26).grade).toBe('outside')
  })

  it('grades the angle to the nearest whole degree, as it is shown', () => {
    expect(checkPlacementRange(FIVE_ONE, 'R', 30.4)).toMatchObject({
      angle: 30,
      grade: 'ideal',
    })
    expect(checkPlacementRange(FIVE_ONE, 'L', -30.6)).toMatchObject({
      angle: 31,
      grade: 'acceptable',
    })
    expect(checkPlacementRange(FIVE_ONE, 'R', 21.4)).toMatchObject({
      angle: 21,
      grade: 'outside',
    })
  })
})

describe('placement-range grade of channels with a single Dolby range', () => {
  it.each([
    [0, 'ideal'],
    [0.4, 'ideal'],
    [-0.4, 'ideal'],
    [1, 'outside'],
    [-1, 'outside'],
  ] as const)('grades Center at %f° as %s', (azimuth, grade) => {
    expect(checkPlacementRange(FIVE_ONE, 'C', azimuth).grade).toBe(grade)
  })

  // 5-channel bed: Ls/Rs 110°–120°
  it.each([
    ['Ls', -110, 'ideal'],
    ['Ls', -120, 'ideal'],
    ['Ls', -109, 'outside'],
    ['Ls', -121, 'outside'],
    ['Rs', 110, 'ideal'],
    ['Rs', 120, 'ideal'],
    ['Rs', 109, 'outside'],
    ['Rs', 121, 'outside'],
  ] as const)('grades %s in 5.1 at %f° as %s', (channel, azimuth, grade) => {
    expect(checkPlacementRange(FIVE_ONE, channel, azimuth).grade).toBe(grade)
  })

  // 7-channel bed: Ls/Rs 90°–110°, Lrs/Rrs 135°–150°
  it.each([
    ['Ls', -90, 'ideal'],
    ['Ls', -110, 'ideal'],
    ['Ls', -89, 'outside'],
    ['Ls', -111, 'outside'],
    ['Rs', 90, 'ideal'],
    ['Rs', 111, 'outside'],
    ['Lrs', -135, 'ideal'],
    ['Lrs', -150, 'ideal'],
    ['Lrs', -134, 'outside'],
    ['Lrs', -151, 'outside'],
    ['Rrs', 135, 'ideal'],
    ['Rrs', 150, 'ideal'],
    ['Rrs', 151, 'outside'],
  ] as const)('grades %s in 7.1.4 at %f° as %s', (channel, azimuth, grade) => {
    expect(checkPlacementRange(SEVEN_ONE_FOUR, channel, azimuth).grade).toBe(
      grade,
    )
  })
})

describe('placement-range sources', () => {
  it('cites the per-layout sheet for the ideal range and IG fig.3 for the wider L/R range, noting the conflict', () => {
    const { ideal, acceptable } = checkPlacementRange(FIVE_ONE, 'L', -26)

    expect(ideal.range).toEqual({ min: 22, max: 30 })
    expect(ideal.citations).toContainEqual({ source: 'S-51' })
    expect(acceptable).toMatchObject({
      range: { min: 22, max: 40 },
      citations: [expect.objectContaining({ source: 'IG', page: 8 })],
      note: expect.stringMatching(/conflict/i) as unknown,
    })
  })

  it('records that Dolby gives no wider range for the other channels', () => {
    const { ideal, acceptable } = checkPlacementRange(
      SEVEN_ONE_FOUR,
      'Lrs',
      -140,
    )

    expect(ideal.range).toEqual({ min: 135, max: 150 })
    expect(ideal.citations).toContainEqual({ source: 'S-714-OH' })
    expect(acceptable).toEqual({
      range: null,
      note: 'Dolby gives no wider range',
    })
  })

  it('refuses a channel the layout does not have', () => {
    expect(() => checkPlacementRange('2.1', 'C', 0)).toThrow(
      /2\.1 has no C channel/,
    )
  })
})
