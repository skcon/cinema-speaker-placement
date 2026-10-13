import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type ResponseRow,
  type RoomPoint,
  type SubwooferCount,
} from '@/domain'
import {
  boundaryReflections,
  interferenceLevels,
} from './boundary-interference'
import {
  calibrateResponse,
  estimateResponse,
  prepareRoomResponse,
  responseDeviations,
} from './estimated-response'
import { bearingTo } from './room'
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

const PORTED = {
  ...DEFAULT_CONFIG.speakerGroups.subwoofers.specs,
  enclosure: 'ported',
} as const

describe('estimated response at the MLP', () => {
  const { estimated } = analyzeRoom(DEFAULT_CONFIG).response

  it('covers 20 Hz to about 500 Hz on a log axis, 225 points, every 16th a base-10 third-octave frequency', () => {
    const frequencies = estimated.rows.map((row) => row.frequency)

    expect(frequencies).toHaveLength(225)
    expect(frequencies[0]).toBe(20)
    // 20·10^1.4
    expect(frequencies.at(-1)).toBeCloseTo(502.377, 3)
    // 20·10^(k/10): 25.18, 63.25, 100.24, 200 Hz
    expect(frequencies[16]).toBeCloseTo(25.179, 3)
    expect(frequencies[80]).toBeCloseTo(63.246, 3)
    expect(frequencies[112]).toBeCloseTo(100.237, 3)
    expect(frequencies[160]).toBeCloseTo(200, 9)
  })

  it('is a finite level at every frequency', () => {
    for (const { estimated: level } of estimated.rows) {
      expect(Number.isFinite(level)).toBe(true)
    }
  })

  it('combines room modes, enclosure roll-off, the crossover and boundary interference, with the model parameters it assumed', () => {
    expect(estimated.components).toEqual([
      'room-modes',
      'enclosure',
      'crossover',
      'boundary-interference',
    ])
    const { speedOfSound, reverberationTime, modalBandwidth } = estimated.model
    expect([speedOfSound, reverberationTime]).toEqual([343, 0.5])
    // 3·ln 10 / (0.5·π) ≈ 2.2/0.5
    expect(modalBandwidth).toBeCloseTo(4.398, 3)
    expect(estimated.model).toMatchObject({
      crossoverHz: 80,
      roomModesUpTo: 200,
      reflectionCoefficient: 1,
    })
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

describe('boundary interference in the estimate', () => {
  it('above 300 Hz follows the Left, Center and Right speakers’ reflections alone, power averaged: the subwoofers are crossed out there', () => {
    const { response, mlp, speakers } = analyzeRoom(DEFAULT_CONFIG)
    const high = response.estimated.rows.filter((r) => r.frequency >= 300)
    const front = speakers.filter((s) => ['L', 'C', 'R'].includes(s.channel))
    const levels = front.map((speaker) =>
      interferenceLevels(
        boundaryReflections(DEFAULT_CONFIG.room, speaker, mlp),
        high.map((r) => r.frequency),
      ),
    )
    const alone = high.map(
      (_, i) =>
        10 *
        Math.log10(
          levels.reduce((sum, own) => sum + 10 ** (own[i]! / 10), 0) / 3,
        ),
    )
    const offsets = high.map((row, i) => row.estimated - alone[i]!)

    for (const offset of offsets) expect(offset).toBeCloseTo(offsets[0]!, 0)
  })

  it('has a notch from the default Left speaker’s floor reflection, at c/(2Δ) for its path difference Δ', () => {
    const { response, mlp, speakers } = analyzeRoom(DEFAULT_CONFIG)
    const left = speakers.find((s) => s.channel === 'L')!
    const floor = boundaryReflections(DEFAULT_CONFIG.room, left, mlp).find(
      (r) => r.surface === 'floor',
    )!
    // Speaker and ear both 1.2 m up, 1.98 m apart: Δ = √(1.98² + 2.4²) − 1.98.
    expect(floor.pathDifference).toBeCloseTo(Math.hypot(1.98, 2.4) - 1.98, 2)
    const notch = floor.notchFrequencies[0]!
    const rows = response.estimated.rows
    const level = (f: number) => rowAt(rows, f).estimated
    expect(level(notch)).toBeLessThan(level(notch / 1.3))
  })
})

describe('the crossover in the estimate', () => {
  it('keeps the speakers’ part above twice the crossover the same, whatever the crossover', () => {
    const shape = (crossoverHz: number) => {
      const rows = rowsOf({ ...DEFAULT_CONFIG, crossoverHz }).filter(
        (r) => r.frequency >= 400,
      )
      return rows.map((r) => r.estimated - rows[0]!.estimated)
    }
    shape(60).forEach((value, i) => {
      expect(value).toBeCloseTo(shape(150)[i]!, 0)
    })
  })

  it('hands 100-200 Hz to the subwoofers’ room modes when raised to 200 Hz', () => {
    const band = (crossoverHz: number) =>
      rowsOf({ ...DEFAULT_CONFIG, crossoverHz })
        .filter((r) => r.frequency >= 100 && r.frequency <= 200)
        .map((r) => r.estimated)
    const difference = band(80).map((level, i) =>
      Math.abs(level - band(200)[i]!),
    )
    expect(Math.max(...difference)).toBeGreaterThan(3)
  })
})

describe('the enclosure in the estimate', () => {
  /** Level at 30 Hz relative to 50 Hz, crossover high so the speakers stay out. */
  function tilt(config: Config): number {
    const rows = rowsOf({ ...config, crossoverHz: 200 })
    return rowAt(rows, 30).estimated - rowAt(rows, 50).estimated
  }

  it('lifts 30 Hz against 50 Hz by the difference between a 4th-order 20 Hz and a 2nd-order 30 Hz roll-off for ported subwoofers', () => {
    const sealed = DEFAULT_CONFIG
    const ported: Config = {
      ...DEFAULT_CONFIG,
      speakerGroups: { subwoofers: { specs: PORTED, ownSpecs: {} } },
    }
    // Butterworth: |H|² = x^(2n) / (1 + x^(2n)).
    const db = (x: number, n: number) =>
      10 * Math.log10(x ** (2 * n) / (1 + x ** (2 * n)))
    const expected =
      db(30 / 20, 4) - db(50 / 20, 4) - (db(30 / 30, 2) - db(50 / 30, 2))

    expect(tilt(ported) - tilt(sealed)).toBeCloseTo(expected, 1)
  })

  it('models a mixed set: one ported subwoofer among sealed ones changes the estimate', () => {
    const mixed: Config = {
      ...withSubwoofers(2),
      speakerGroups: {
        subwoofers: {
          specs: DEFAULT_CONFIG.speakerGroups.subwoofers.specs,
          ownSpecs: { Sub2: PORTED },
        },
      },
    }
    expect(tilt(mixed)).not.toBeCloseTo(tilt(withSubwoofers(2)), 1)
  })
})

describe('a room response prepared once', () => {
  /** The default room's prepared response and its MLP listening, as analyzeRoom builds them. */
  function defaultSetup(config: Config = DEFAULT_CONFIG) {
    const { response, mlp, subwoofers } = analyzeRoom(config)
    const frequencies = response.estimated.rows.map((r) => r.frequency)
    const prepared = prepareRoomResponse({
      room: config.room,
      subwoofers: subwoofers.map((s) => ({
        position: s.position,
        enclosure: s.specs.enclosure,
      })),
      crossoverHz: config.crossoverHz,
      frequencies,
    })
    return {
      response,
      mlp,
      frequencies,
      prepared,
      target: targetCurve(config.targetCurve, frequencies),
    }
  }

  /** The front three speakers' levels at `receiver`, each facing it. */
  function frontSpeakerLevels(
    receiver: RoomPoint,
    frequencies: readonly number[],
  ): number[][] {
    const { speakers } = analyzeRoom(DEFAULT_CONFIG)
    return speakers
      .filter((s) => ['L', 'C', 'R'].includes(s.channel))
      .map(({ position }) => {
        const aim = { yaw: bearingTo(position, receiver) }
        const reflections = boundaryReflections(
          DEFAULT_CONFIG.room,
          { position, aim },
          receiver,
        )
        return interferenceLevels(reflections, frequencies)
      })
  }

  it('gives the same estimate at the MLP as analyzeRoom does, calibrated there', () => {
    const { response, mlp, frequencies, prepared, target } = defaultSetup()
    const listening = {
      receiver: mlp,
      speakerLevels: frontSpeakerLevels(mlp, frequencies),
    }

    expect(estimateResponse(prepared, listening, target)).toEqual(
      response.estimated,
    )
    expect(
      estimateResponse(
        prepared,
        listening,
        target,
        calibrateResponse(prepared, listening, target),
      ),
    ).toEqual(response.estimated)
  })

  it('reuses the preparation when only the listening position changes', () => {
    const first = defaultSetup().prepared
    const moved = defaultSetup({ ...DEFAULT_CONFIG, targetCurve: 'house' })

    expect(moved.prepared).toBe(first)
    expect(
      defaultSetup({ ...DEFAULT_CONFIG, crossoverHz: 100 }).prepared,
    ).not.toBe(first)
  })

  it('gives a grid the deviations alone, the same as the full estimate’s', () => {
    const { response, mlp, frequencies, prepared, target } = defaultSetup()
    const listening = {
      receiver: mlp,
      speakerLevels: frontSpeakerLevels(mlp, frequencies),
    }

    const deviations = responseDeviations(
      prepared,
      listening,
      target,
      response.estimated.calibration,
    )

    deviations.forEach((deviation, i) => {
      const row = response.estimated.rows[i]!
      expect(deviation).toBeCloseTo(row.estimated - row.target, 9)
    })
  })

  it('shows weaker bass at another seat with the MLP’s calibration, which calibrating at that seat would hide', () => {
    const { response, frequencies, prepared, target } = defaultSetup()
    // Halfway back, off the center line: on the first length mode's node,
    // where the front-wall subwoofer's lowest mode is not heard.
    const seat = { x: 1, y: 3, z: 1.2 }
    const listening = {
      receiver: seat,
      speakerLevels: frontSpeakerLevels(seat, frequencies),
    }
    /** Mean deviation over the reliable rows up to the crossover. */
    const bass = (deviations: readonly number[]) => {
      const picked = deviations.filter(
        (_, i) =>
          frequencies[i]! >= prepared.reliableFrom! && frequencies[i]! <= 80,
      )
      return picked.reduce((a, b) => a + b, 0) / picked.length
    }
    const atMlp = bass(
      response.estimated.rows.map((r) => r.estimated - r.target),
    )
    const fixed = bass(
      responseDeviations(
        prepared,
        listening,
        target,
        response.estimated.calibration,
      ),
    )
    const recalibrated = bass(
      responseDeviations(
        prepared,
        listening,
        target,
        calibrateResponse(prepared, listening, target),
      ),
    )

    expect(fixed).toBeLessThan(atMlp - 3)
    expect(Math.abs(recalibrated - atMlp)).toBeLessThan(Math.abs(fixed - atMlp))
  })

  it('follows the frequencies it is given, beyond the default band', () => {
    const frequencies = [30, 60, 120, 240, 480]
    const prepared = prepareRoomResponse({
      room: DEFAULT_CONFIG.room,
      subwoofers: [{ position: { x: 0, y: 0.3, z: 0.3 }, enclosure: 'sealed' }],
      crossoverHz: 80,
      frequencies,
    })
    const { rows } = estimateResponse(
      prepared,
      { receiver: { x: 0, y: 2.28, z: 1.2 }, speakerLevels: [] },
      targetCurve('flat', frequencies),
    )

    expect(rows.map((r) => r.frequency)).toEqual(frequencies)
  })

  it('scores a 20 x 20 grid of seats in the largest room with 4 subwoofers and 3 speakers quickly, for the seat score (#14)', () => {
    // About 0.6 s under Vitest on a 2024 laptop; the bound only catches a
    // regression to recomputing the room modes per seat.
    const room = { length: 15, width: 15, height: 5 }
    const frequencies = analyzeRoom(DEFAULT_CONFIG).response.estimated.rows.map(
      (r) => r.frequency,
    )
    const target = targetCurve('flat', frequencies)
    const front = [-1.5, 0, 1.5].map((x) => ({ x, y: 0.5, z: 1.2 }))
    const levelsAt = (receiver: RoomPoint) =>
      front.map((position) =>
        interferenceLevels(
          boundaryReflections(
            room,
            { position, aim: { yaw: bearingTo(position, receiver) } },
            receiver,
          ),
          frequencies,
        ),
      )
    const started = performance.now()
    const prepared = prepareRoomResponse({
      room,
      subwoofers: [
        { x: 0, y: 0.3, z: 0.3 },
        { x: -7.2, y: 7.5, z: 0.3 },
        { x: 7.2, y: 7.5, z: 0.3 },
        { x: 0, y: 14.7, z: 0.3 },
      ].map((position) => ({ position, enclosure: 'ported' as const })),
      crossoverHz: 80,
      frequencies,
    })
    const mlp = { x: 0, y: 5.7, z: 1.2 }
    const calibration = calibrateResponse(
      prepared,
      { receiver: mlp, speakerLevels: levelsAt(mlp) },
      target,
    )
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const receiver = { x: -7 + (14 * i) / 19, y: 1 + (13 * j) / 19, z: 1.2 }
        responseDeviations(
          prepared,
          { receiver, speakerLevels: levelsAt(receiver) },
          target,
          calibration,
        )
      }
    }

    expect(performance.now() - started).toBeLessThan(3000)
  })
})
