import { describe, expect, it } from 'vitest'
import {
  DOLBY_LAYOUTS,
  type ChannelId,
  type DolbyLayout,
  type OverheadChannelId,
} from '@/domain/dolby-layouts'
import {
  checkOverheadPlacementRange,
  checkPlacementRange,
} from '@/domain/placement-range'

const FIVE_ONE = '5.1'
const SEVEN_ONE_FOUR = '7.1.4'

/** Check an azimuth against a channel's placement range in a Dolby layout. */
function check(dolbyLayout: DolbyLayout, channel: ChannelId, azimuth: number) {
  const reference = DOLBY_LAYOUTS[dolbyLayout].channels.find(
    (entry) => entry.channel === channel,
  )
  if (!reference) throw new Error(`${dolbyLayout} has no ${channel} channel`)
  return checkPlacementRange(reference, azimuth)
}

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
    expect(check(FIVE_ONE, 'R', azimuth).grade).toBe(grade)
  })

  it.each([
    [-22, 'ideal'],
    [-30, 'ideal'],
    [-31, 'acceptable'],
    [-40, 'acceptable'],
    [-41, 'outside'],
    [-21, 'outside'],
  ] as const)('grades Left at %f° as %s', (azimuth, grade) => {
    expect(check(FIVE_ONE, 'L', azimuth).grade).toBe(grade)
  })

  it('uses the same ranges in a layout with overheads', () => {
    expect(check(SEVEN_ONE_FOUR, 'R', 30).grade).toBe('ideal')
    expect(check(SEVEN_ONE_FOUR, 'R', 40).grade).toBe('acceptable')
    expect(check(SEVEN_ONE_FOUR, 'R', 41).grade).toBe('outside')
  })

  it('grades a speaker on the wrong side of the center-front reference as outside', () => {
    expect(check(FIVE_ONE, 'L', 26).grade).toBe('outside')
    expect(check(FIVE_ONE, 'R', -26).grade).toBe('outside')
  })

  it('grades the angle to the nearest whole degree, as it is shown', () => {
    expect(check(FIVE_ONE, 'R', 30.4).azimuth).toMatchObject({
      degrees: 30.4,
      shown: 30,
      grade: 'ideal',
    })
    expect(check(FIVE_ONE, 'L', -30.6).azimuth).toMatchObject({
      degrees: -30.6,
      shown: 31,
      grade: 'acceptable',
    })
    expect(check(FIVE_ONE, 'R', 21.4).azimuth).toMatchObject({
      shown: 21,
      grade: 'outside',
    })
  })

  it('gives the overall grade of the azimuth, the only angle graded so far', () => {
    expect(check(FIVE_ONE, 'R', 35)).toMatchObject({
      grade: 'acceptable',
      azimuth: { grade: 'acceptable' },
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
    expect(check(FIVE_ONE, 'C', azimuth).grade).toBe(grade)
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
    expect(check(FIVE_ONE, channel, azimuth).grade).toBe(grade)
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
    expect(check(SEVEN_ONE_FOUR, channel, azimuth).grade).toBe(grade)
  })
})

describe('placement-range sources', () => {
  it('cites the per-layout sheet for the ideal range and IG fig.3 for the wider L/R range, noting the conflict', () => {
    const { ideal, acceptable } = check(FIVE_ONE, 'L', -26).azimuth

    expect(ideal.range).toEqual({ min: 22, max: 30 })
    expect(ideal.citations).toContainEqual({ source: 'S-51' })
    expect(acceptable).toMatchObject({
      range: { min: 22, max: 40 },
      citations: [expect.objectContaining({ source: 'IG', page: 8 })],
      note: expect.stringMatching(/conflict/i) as unknown,
    })
  })

  it('records that Dolby gives no wider range for the other channels', () => {
    const { ideal, acceptable } = check(SEVEN_ONE_FOUR, 'Lrs', -140).azimuth

    expect(ideal.range).toEqual({ min: 135, max: 150 })
    expect(ideal.citations).toContainEqual({ source: 'S-714-OH' })
    // The research file's 7.1.4 row cites IG pp.8, 36–39
    expect(ideal.citations).toContainEqual({ source: 'IG', page: 8 })
    expect(acceptable).toEqual({
      range: null,
      note: 'Dolby gives no wider range',
    })
  })
})

/** Check an overhead's azimuth and elevation in a Dolby layout. */
function checkOverhead(
  dolbyLayout: DolbyLayout,
  channel: OverheadChannelId,
  azimuth: number,
  elevation: number,
) {
  const reference = DOLBY_LAYOUTS[dolbyLayout].overheadChannels.find(
    (entry) => entry.channel === channel,
  )
  if (!reference) throw new Error(`${dolbyLayout} has no ${channel} channel`)
  return checkOverheadPlacementRange(reference, azimuth, elevation)
}

describe('placement-range grade of overhead elevation', () => {
  // Top front 30°–55°, top rear 125°–150° (Dolby's side-view convention)
  it.each([
    ['Ltf', -45, 30, 'ideal'],
    ['Ltf', -45, 55, 'ideal'],
    ['Ltf', -45, 29, 'outside'],
    ['Ltf', -45, 56, 'outside'],
    ['Rtr', 135, 125, 'ideal'],
    ['Rtr', 135, 150, 'ideal'],
    ['Rtr', 135, 124, 'outside'],
    ['Rtr', 135, 151, 'outside'],
  ] as const)(
    'grades %s in 7.1.4 at %f° azimuth and %f° elevation as %s',
    (channel, azimuth, elevation, grade) => {
      const check = checkOverhead(SEVEN_ONE_FOUR, channel, azimuth, elevation)
      expect(check.elevation.grade).toBe(grade)
      expect(check.grade).toBe(grade)
    },
  )

  // Top middle 65°–100°
  it.each([
    [65, 'ideal'],
    [100, 'ideal'],
    [64, 'outside'],
    [101, 'outside'],
  ] as const)('grades Ltm in 5.1.2 at %f° as %s', (elevation, grade) => {
    expect(checkOverhead('5.1.2', 'Ltm', -20, elevation).grade).toBe(grade)
  })

  it('grades the elevation to the nearest whole degree, as it is shown', () => {
    expect(
      checkOverhead(SEVEN_ONE_FOUR, 'Ltf', -45, 55.4).elevation,
    ).toMatchObject({ degrees: 55.4, shown: 55, grade: 'ideal' })
    expect(
      checkOverhead(SEVEN_ONE_FOUR, 'Ltf', -45, 29.6).elevation,
    ).toMatchObject({ shown: 30, grade: 'ideal' })
  })

  it('gives the worst grade of the azimuth and the elevation', () => {
    // Azimuth 30°–60° on the channel's side; elevation 30°–55°.
    expect(checkOverhead(SEVEN_ONE_FOUR, 'Rtf', 45, 45).grade).toBe('ideal')
    expect(checkOverhead(SEVEN_ONE_FOUR, 'Rtf', 20, 45)).toMatchObject({
      grade: 'outside',
      azimuth: { grade: 'outside' },
      elevation: { grade: 'ideal' },
    })
    expect(checkOverhead(SEVEN_ONE_FOUR, 'Rtf', 45, 70)).toMatchObject({
      grade: 'outside',
      azimuth: { grade: 'ideal' },
      elevation: { grade: 'outside' },
    })
    // Left Top Front on the right side of the room.
    expect(checkOverhead(SEVEN_ONE_FOUR, 'Ltf', 45, 45).grade).toBe('outside')
  })

  it('leaves the top middle azimuth ungraded, as Dolby gives none, and grades the elevation only', () => {
    const check = checkOverhead('7.1.2', 'Rtm', 170, 80)

    expect(check.grade).toBe('ideal')
    expect(check.azimuth).toMatchObject({
      ideal: null,
      degrees: 170,
      shown: 170,
      grade: null,
    })
  })
})
