import { describe, expect, it } from 'vitest'
import {
  DOLBY_LAYOUTS,
  OVERHEAD_SPACING,
  V1_DOLBY_LAYOUTS,
  type DolbyLayout,
  type OverheadChannelId,
} from '@/domain/dolby-layouts'

function overhead(dolbyLayout: DolbyLayout, channel: OverheadChannelId) {
  const reference = DOLBY_LAYOUTS[dolbyLayout].overheadChannels.find(
    (entry) => entry.channel === channel,
  )
  if (!reference) throw new Error(`${dolbyLayout} has no ${channel} channel`)
  return reference
}

describe('overhead channels of the Dolby layouts', () => {
  it.each(V1_DOLBY_LAYOUTS)(
    '%s lists as many overhead channels as its Z',
    (dolbyLayout) => {
      const { overheads, overheadChannels } = DOLBY_LAYOUTS[dolbyLayout]

      expect(overheadChannels).toHaveLength(overheads)
    },
  )

  it('gives x.1.2 layouts the top middle pair and x.1.4 layouts the top front and top rear pairs', () => {
    const channels = (dolbyLayout: DolbyLayout) =>
      DOLBY_LAYOUTS[dolbyLayout].overheadChannels.map(({ channel }) => channel)

    expect(channels('5.1.2')).toEqual(['Ltm', 'Rtm'])
    expect(channels('7.1.2')).toEqual(['Ltm', 'Rtm'])
    expect(channels('5.1.4')).toEqual(['Ltf', 'Rtf', 'Ltr', 'Rtr'])
    expect(channels('7.1.4')).toEqual(['Ltf', 'Rtf', 'Ltr', 'Rtr'])
    expect(channels('7.1')).toEqual([])
  })
})

describe('overhead placement ranges (research section 4)', () => {
  it('puts top front at 30°–55° elevation, 45° nominal, and 30°–60° azimuth', () => {
    const { elevation, azimuth } = overhead('7.1.4', 'Ltf')

    expect(elevation.ideal.range).toEqual({ min: 30, max: 55 })
    expect(elevation.nominal).toBe(45)
    expect(elevation.ideal.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'IG', page: 7 }),
        expect.objectContaining({ source: 'IG', page: 8, figure: 'fig.2' }),
        { source: 'S-514-OH' },
        { source: 'S-714-OH' },
      ]),
    )
    expect(elevation.acceptable.range).toBeNull()
    expect(azimuth.ideal?.range).toEqual({ min: 30, max: 60 })
    expect(azimuth.ideal?.citations).toContainEqual(
      expect.objectContaining({ source: 'IG', page: 9, figure: 'fig.4' }),
    )
  })

  it('puts top rear at 125°–150° elevation, 135° nominal, and 120°–150° azimuth', () => {
    const { elevation, azimuth } = overhead('5.1.4', 'Rtr')

    expect(elevation.ideal.range).toEqual({ min: 125, max: 150 })
    expect(elevation.nominal).toBe(135)
    expect(elevation.ideal.citations).toContainEqual({ source: 'S-514-OH' })
    expect(azimuth.ideal?.range).toEqual({ min: 120, max: 150 })
  })

  it('puts top middle at 65°–100° elevation with no nominal and records that Dolby gives no azimuth range', () => {
    const { elevation, azimuth } = overhead('5.1.2', 'Ltm')

    expect(elevation.ideal.range).toEqual({ min: 65, max: 100 })
    expect(elevation.nominal).toBeNull()
    expect(elevation.ideal.citations).toEqual([
      { source: 'S-512-OH' },
      { source: 'S-712-OH' },
    ])
    expect(azimuth).toEqual({
      ideal: null,
      note: expect.stringMatching(/no azimuth/i) as unknown,
    })
  })

  it('spaces the overhead pairs 0.5–0.7 × the layout width (IG p.7, fig.3)', () => {
    expect(OVERHEAD_SPACING.range).toEqual({ min: 0.5, max: 0.7 })
    expect(OVERHEAD_SPACING.citations).toContainEqual(
      expect.objectContaining({ source: 'IG', page: 7 }),
    )
    expect(OVERHEAD_SPACING.citations).toContainEqual(
      expect.objectContaining({ source: 'IG', page: 8, figure: 'fig.3' }),
    )
  })
})
