import { describe, expect, it } from 'vitest'
import {
  DOLBY_LAYOUTS,
  SUBWOOFER_NO_RANGE,
  type AngleReference,
  type NoAngleRange,
} from '@/domain/dolby-layouts'
import { sourceOf, type Citation } from '@/domain/reference'

/** Every citation of one angle's ranges. */
function citationsOf(reference: AngleReference | NoAngleRange) {
  if (reference.ideal === null) return []
  const { ideal, acceptable } = reference
  return [
    ...ideal.citations,
    ...(acceptable.range === null ? [] : acceptable.citations),
  ]
}

const shownCitations: readonly Citation[] = [
  ...Object.values(DOLBY_LAYOUTS).flatMap(({ channels, overheadChannels }) => [
    ...channels.flatMap(({ azimuth }) => citationsOf(azimuth)),
    ...overheadChannels.flatMap(({ azimuth, elevation }) => [
      ...citationsOf(azimuth),
      ...citationsOf(elevation),
    ]),
  ]),
  ...SUBWOOFER_NO_RANGE.citations,
]

describe('the sources shown with the grades', () => {
  it('has a title and a link for every source a placement range or a subwoofer cites', () => {
    const keys = new Set(
      shownCitations.flatMap((citation) =>
        'source' in citation ? [citation.source] : [],
      ),
    )

    for (const key of keys) {
      const source = sourceOf(key)
      expect(source?.title, key).toBeTruthy()
      expect(source?.url, key).toMatch(/^https:\/\//)
    }
  })

  it('has none for a source no grade cites', () => {
    expect(sourceOf('KUTTRUFF')).toBeNull()
  })
})
