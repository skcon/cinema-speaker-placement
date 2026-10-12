import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type ResponseRow,
  type SubwooferCount,
} from '@/domain'
import { estimateResponse, prepareRoomResponse } from './estimated-response'
import { targetCurve } from './target-curve'

function withSubwoofers(subwoofers: SubwooferCount): Config {
  return { ...DEFAULT_CONFIG, layout: { dolbyLayout: '5.1', subwoofers } }
}

function rowsOf(config: Config): readonly ResponseRow[] {
  return analyzeRoom(config).response.estimated.rows
}

/** The row nearest `frequency`. */
function rowAt(rows: readonly ResponseRow[], frequency: number): ResponseRow {
  const distances = rows.map((row) => Math.abs(row.frequency - frequency))
  return rows[distances.indexOf(Math.min(...distances))]!
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b) / values.length
}

describe('estimated response at the MLP', () => {
  const { estimated } = analyzeRoom(DEFAULT_CONFIG).response

  it('covers 20-200 Hz on a log axis, 161 points, every 16th a base-10 third-octave frequency', () => {
    const frequencies = estimated.rows.map((row) => row.frequency)

    expect(frequencies).toHaveLength(161)
    expect(frequencies[0]).toBe(20)
    expect(frequencies.at(-1)).toBeCloseTo(200, 10)
    // 20·10^(k/10): 25.18, 63.25, 100.24 Hz
    expect(frequencies[16]).toBeCloseTo(25.179, 3)
    expect(frequencies[80]).toBeCloseTo(63.246, 3)
    expect(frequencies[112]).toBeCloseTo(100.237, 3)
  })

  it('is a finite level at every frequency', () => {
    for (const { estimated: level } of estimated.rows) {
      expect(Number.isFinite(level)).toBe(true)
    }
  })

  it('comes from the room modes only so far, with the model parameters it assumed', () => {
    expect(estimated.components).toEqual(['room-modes'])
    const { speedOfSound, reverberationTime, modalBandwidth } = estimated.model
    expect([speedOfSound, reverberationTime]).toEqual([343, 0.5])
    // 3·ln 10 / (0.5·π) ≈ 2.2/0.5
    expect(modalBandwidth).toBeCloseTo(4.398, 3)
  })

  it('is reliable from the lowest mode one front-wall subwoofer excites: the first length mode, 343/12 Hz', () => {
    expect(estimated.reliableFrom).toBeCloseTo(343 / 12, 6)
    for (const { frequency, reliable } of estimated.rows) {
      expect(reliable).toBe(frequency >= 343 / 12)
    }
  })

  it('is reliable only from 343/6 Hz with front and back subwoofers, which cancel the first length mode (and sit on the width modes’ odd nodes)', () => {
    // Both on the center line, so odd width modes vanish at them too; the
    // first mode they excite is the second length mode, 57.17 Hz.
    const { reliableFrom } = analyzeRoom(withSubwoofers(2)).response.estimated
    expect(reliableFrom).toBeCloseTo(343 / 6, 6)
  })

  it('is level-matched to the target over the reliable rows: their average deviation is 0 dB', () => {
    for (const config of [
      DEFAULT_CONFIG,
      { ...DEFAULT_CONFIG, targetCurve: 'house' } as const,
      withSubwoofers(2),
    ]) {
      const reliable = rowsOf(config).filter((row) => row.reliable)
      expect(mean(reliable.map((r) => r.estimated - r.target))).toBeCloseTo(
        0,
        9,
      )
    }
  })

  it('carries the target and its ±3 dB band in every row', () => {
    const house = rowsOf({ ...DEFAULT_CONFIG, targetCurve: 'house' })
    // 6 / (1 + 0.2²) at 20 Hz
    expect(house[0]).toMatchObject({
      target: expect.closeTo(5.769, 3) as number,
      low: expect.closeTo(2.769, 3) as number,
      high: expect.closeTo(8.769, 3) as number,
    })
    expect(rowsOf(DEFAULT_CONFIG).every((row) => row.target === 0)).toBe(true)
  })

  it('loses the first length mode (28.6 Hz) with two subwoofers at the front and back walls', () => {
    const deviation = (config: Config) => {
      const row = rowAt(rowsOf(config), 343 / 12)
      return row.estimated - row.target
    }
    expect(
      deviation(withSubwoofers(1)) - deviation(withSubwoofers(2)),
    ).toBeGreaterThan(10)
  })

  it('changes with the room and with the subwoofer count', () => {
    const levels = (config: Config) => rowsOf(config).map((r) => r.estimated)
    const longer = {
      ...DEFAULT_CONFIG,
      room: { ...DEFAULT_CONFIG.room, length: 7 },
    }

    expect(levels(longer)).not.toEqual(levels(DEFAULT_CONFIG))
    expect(levels(withSubwoofers(4))).not.toEqual(levels(withSubwoofers(1)))
  })
})

describe('a room response prepared once', () => {
  it('gives the same estimate at a receiver as analyzeRoom does at the MLP, for any frequency list', () => {
    const { response, mlp, subwoofers } = analyzeRoom(DEFAULT_CONFIG)
    const frequencies = response.estimated.rows.map((r) => r.frequency)
    const prepared = prepareRoomResponse({
      room: DEFAULT_CONFIG.room,
      sources: subwoofers.map((s) => s.position),
      frequencies,
    })

    expect(
      estimateResponse(prepared, mlp, targetCurve('flat', frequencies)),
    ).toEqual(response.estimated)
  })

  it('follows the frequencies it is given, beyond the default band', () => {
    const frequencies = [30, 60, 120, 240, 480]
    const prepared = prepareRoomResponse({
      room: DEFAULT_CONFIG.room,
      sources: [{ x: 0, y: 0.3, z: 0.3 }],
      frequencies,
    })
    const { rows } = estimateResponse(
      prepared,
      { x: 0, y: 2.28, z: 1.2 },
      targetCurve('flat', frequencies),
    )

    expect(rows.map((r) => r.frequency)).toEqual(frequencies)
  })
})
