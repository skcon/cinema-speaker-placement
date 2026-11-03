import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { DEFAULT_CONFIG } from './config'
import type { ResponseRow } from './estimated-response'
import {
  responseScore,
  responseTable,
  summarizeResponse,
} from './response-summary'

/** A row against a flat target with its ±3 dB band. */
function row(
  frequency: number,
  estimated: number,
  reliable = true,
): ResponseRow {
  return { frequency, estimated, target: 0, low: -3, high: 3, reliable }
}

describe('response summary', () => {
  it('gives the share inside the band, the largest peak and the deepest dip against the target', () => {
    const summary = summarizeResponse([
      row(20, 0),
      row(40, 4),
      row(60, -5),
      { ...row(80, 2), target: 1, low: -2, high: 4 },
    ])

    expect(summary).toEqual({
      withinTolerance: 0.5,
      largestPeak: { frequency: 40, deviation: 4 },
      deepestDip: { frequency: 60, deviation: -5 },
    })
  })

  it('counts the band edges as inside', () => {
    expect(summarizeResponse([row(20, 3), row(40, -3)]).withinTolerance).toBe(1)
  })

  it('leaves out the unreliable rows below the lowest excited mode', () => {
    const summary = summarizeResponse([
      row(20, -20, false),
      row(25, 12, false),
      row(40, 2),
      row(60, -4),
    ])

    expect(summary).toEqual({
      withinTolerance: 0.5,
      largestPeak: { frequency: 40, deviation: 2 },
      deepestDip: { frequency: 60, deviation: -4 },
    })
  })

  it('is part of the analysis', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)

    expect(response.summary).toEqual(summarizeResponse(response.estimated.rows))
  })
})

describe('response score', () => {
  it('scores a response wholly inside the band 100, good', () => {
    const summary = summarizeResponse([row(20, 1), row(40, -2), row(60, 3)])

    expect(responseScore(summary)).toEqual({ value: 100, band: 'good' })
  })

  it('scores a response wholly outside the band 0, poor', () => {
    const summary = summarizeResponse([row(20, 6), row(40, -8)])

    expect(responseScore(summary)).toEqual({ value: 0, band: 'poor' })
  })

  it('is the share of the reliable frequencies inside the band, out of 100', () => {
    // 3 of 4 reliable rows inside; the unreliable ones are left out.
    const summary = summarizeResponse([
      row(20, -20, false),
      row(25, 12, false),
      row(40, 2),
      row(60, 0),
      row(80, -1),
      row(100, 5),
    ])

    expect(responseScore(summary)).toEqual({ value: 75, band: 'fair' })
  })

  it('rounds to a whole number', () => {
    // 2 of 3 inside: 66.7.
    const summary = summarizeResponse([row(20, 0), row(40, 0), row(60, 9)])

    expect(responseScore(summary).value).toBe(67)
  })

  it.each([
    [1, 'good'],
    [0.8, 'good'],
    [0.795, 'good'], // rounds to 80, so the band matches the shown number
    [0.79, 'fair'],
    [0.6, 'fair'],
    [0.59, 'poor'],
    [0, 'poor'],
  ] as const)('puts a share of %s in the %s band', (withinTolerance, band) => {
    expect(responseScore({ withinTolerance }).band).toBe(band)
  })

  it('is part of the analysis', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)

    expect(response.score).toEqual(responseScore(response.summary))
  })
})

describe('response table', () => {
  it('picks the rows nearest the base-10 third-octave frequencies in the list', () => {
    const rows = [19, 20.1, 22, 25, 26, 31, 33, 40.5].map((f) => row(f, 0))

    // 19.95, 25.12, 31.62, 39.81 Hz
    expect(responseTable(rows).map((r) => r.frequency)).toEqual([
      20.1, 25, 31, 40.5,
    ])
  })

  it('skips a third-octave frequency with no row near it', () => {
    // Nothing within half a third octave of 25.12 Hz.
    const rows = [20, 22.2, 28.5, 31.6].map((f) => row(f, 0))

    expect(responseTable(rows).map((r) => r.frequency)).toEqual([20, 31.6])
  })

  it('gives the analysis 20, 25.2 ... 502 Hz', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)

    expect(response.tableRows.map((r) => r.frequency)).toEqual(
      [
        20, 25.2, 31.7, 39.9, 50.2, 63.2, 79.6, 100.2, 126.2, 158.9, 200, 251.8,
        317, 399.1, 502.4,
      ].map((hz) => expect.closeTo(hz, 1) as number),
    )
    expect(response.tableRows[0]).toEqual(response.estimated.rows[0])
  })
})
