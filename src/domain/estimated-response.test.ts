import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type ResponseRow,
  type RoomPoint,
  type SubwooferCount,
} from '@/domain'
import { yardsticksFor } from '@/test/relative-speed'
import { HEAVY_TEST_TIMEOUT_MS } from '@/test/timeouts'
import {
  boundaryReflections,
  interferenceLevels,
} from './boundary-interference'
import { hearRoom } from './estimated-response'
import { placeAll } from './placements'
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
    // Reflections start from each speaker's woofer.
    const levels = front.map(({ woofer, aim }) =>
      interferenceLevels(
        boundaryReflections(
          DEFAULT_CONFIG.room,
          { position: woofer, aim },
          mlp,
        ),
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
      speakerGroups: {
        ...DEFAULT_CONFIG.speakerGroups,
        subwoofers: { specs: PORTED, ownSpecs: {} },
      },
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
        ...DEFAULT_CONFIG.speakerGroups,
        subwoofers: {
          specs: DEFAULT_CONFIG.speakerGroups.subwoofers.specs,
          ownSpecs: { Sub2: PORTED },
        },
      },
    }
    expect(tilt(mixed)).not.toBeCloseTo(tilt(withSubwoofers(2)), 1)
  })
})

describe('the heard room', () => {
  /** The config's heard room, and its MLP, as analyzeRoom hears it. */
  function setup(config: Config = DEFAULT_CONFIG) {
    const placements = placeAll(config)
    return {
      room: hearRoom(config, placements),
      mlp: placements.mlp.position,
    }
  }

  /**
   * The front three speakers' levels at `receiver`, each facing it, their
   * reflections starting from the woofer.
   */
  function frontSpeakerLevels(
    receiver: RoomPoint,
    frequencies: readonly number[],
  ): number[][] {
    const { speakers } = analyzeRoom(DEFAULT_CONFIG)
    return speakers
      .filter((s) => ['L', 'C', 'R'].includes(s.channel))
      .map(({ position, woofer }) => {
        const aim = { yaw: bearingTo(position, receiver) }
        const reflections = boundaryReflections(
          DEFAULT_CONFIG.room,
          { position: woofer, aim },
          receiver,
        )
        return interferenceLevels(reflections, frequencies)
      })
  }

  /** The default room heard at `receiver`, with its front three speakers. */
  function hearDefaultAt(receiver: RoomPoint) {
    const { room } = setup()
    return {
      room,
      heard: room.hear({
        receiver,
        speakerLevels: frontSpeakerLevels(receiver, room.frequencies),
      }),
    }
  }

  it('gives the estimate at the MLP that analyzeRoom charts: the front three speakers heard there, calibrated there', () => {
    const { mlp } = setup()
    const { room, heard } = hearDefaultAt(mlp)
    const { estimated } = analyzeRoom(DEFAULT_CONFIG).response

    expect(room.estimateAt(heard)).toEqual(estimated)
    expect(estimated.calibration).toEqual(room.calibrateAt(heard))
  })

  it('works on the response band’s frequencies, reliable where the estimate’s rows are, at every seat', () => {
    const { room } = setup()
    const { rows } = analyzeRoom({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 1, y: 3, z: 1.2 } },
    }).response.estimated

    expect(room.frequencies).toEqual(rows.map((r) => r.frequency))
    expect(room.reliable).toEqual(rows.map((r) => r.reliable))
  })

  it('compares against the config’s target curve', () => {
    const house: Config = { ...DEFAULT_CONFIG, targetCurve: 'house' }
    const { room, mlp } = setup(house)
    const { rows } = room.estimateAt(
      room.hear({
        receiver: mlp,
        speakerLevels: frontSpeakerLevels(mlp, room.frequencies),
      }),
    )

    expect(rows.map((r) => r.target)).toEqual(
      targetCurve('house', room.frequencies).map((t) => t.level),
    )
  })

  it('reuses the preparation when nothing it is prepared from changes (an MLP drag in #9, a target curve here), and not otherwise', () => {
    const first = setup().room.modes

    expect(setup({ ...DEFAULT_CONFIG, targetCurve: 'house' }).room.modes).toBe(
      first,
    )
    expect(setup({ ...DEFAULT_CONFIG, crossoverHz: 100 }).room.modes).not.toBe(
      first,
    )
  })

  it('gives a grid the deviations alone, the same as the full estimate’s', () => {
    const { mlp } = setup()
    const { room, heard } = hearDefaultAt(mlp)
    const { estimated } = analyzeRoom(DEFAULT_CONFIG).response

    const deviations = room.deviationsAt(heard, estimated.calibration)

    deviations.forEach((deviation, i) => {
      const row = estimated.rows[i]!
      expect(deviation).toBeCloseTo(row.estimated - row.target, 9)
    })
  })

  it('shows weaker bass at another seat with the MLP’s calibration, which calibrating at that seat would hide', () => {
    const { estimated } = analyzeRoom(DEFAULT_CONFIG).response
    // Halfway back, off the center line: on the first length mode's node,
    // where the front-wall subwoofer's lowest mode is not heard.
    const { room, heard } = hearDefaultAt({ x: 1, y: 3, z: 1.2 })
    /** Mean deviation over the reliable rows up to the crossover. */
    const bass = (deviations: readonly number[]) => {
      const picked = deviations.filter(
        (_, i) => room.reliable[i] && room.frequencies[i]! <= 80,
      )
      return picked.reduce((a, b) => a + b, 0) / picked.length
    }
    const atMlp = bass(estimated.rows.map((r) => r.estimated - r.target))
    const fixed = bass(room.deviationsAt(heard, estimated.calibration))
    const recalibrated = bass(room.deviationsAt(heard, room.calibrateAt(heard)))

    expect(fixed).toBeLessThan(atMlp - 3)
    expect(Math.abs(recalibrated - atMlp)).toBeLessThan(Math.abs(fixed - atMlp))
  })

  it('finds the room-mode band’s row nearest a frequency, and none outside the band', () => {
    const { room } = setup()
    // Every 16th row is a base-10 third-octave frequency: 63.25 Hz is row
    // 80, 199.9 Hz nearest row 160, the top of the room-mode band.
    expect(room.modeBandRowNearest(63)).toBe(80)
    expect(room.modeBandRowNearest(199.9)).toBe(160)
    expect(room.modeBandRowNearest(250)).toBeUndefined()
    expect(room.modeBandRowNearest(19)).toBeUndefined()
  })

  it(
    'scores a 20 x 20 grid of seats in the largest room with 4 subwoofers and 3 speakers quickly, for the seat score (#14)',
    () => {
      // About 15 yardsticks (0.6 s on a 2024 laptop). The bound, twice
      // that, fails on a 3x slower modal sum (about 37) and on recomputing
      // the room modes per seat (far more). Heavy: the work runs three
      // times; the later runs reuse the memoized preparation, as dragging
      // the MLP does.
      const room = { length: 15, width: 15, height: 5 }
      const config: Config = {
        ...withSubwoofers(4),
        room,
        speakerGroups: {
          ...DEFAULT_CONFIG.speakerGroups,
          subwoofers: { specs: PORTED, ownSpecs: {} },
        },
        manualPositions: {
          Sub1: { x: 0, y: 0.3, z: 0.3 },
          Sub2: { x: -7.2, y: 7.5, z: 0.3 },
          Sub3: { x: 7.2, y: 7.5, z: 0.3 },
          Sub4: { x: 0, y: 14.7, z: 0.3 },
          MLP: { x: 0, y: 5.7, z: 1.2 },
        },
      }
      const placements = placeAll(config)
      const mlp = placements.mlp.position
      const front = [-1.5, 0, 1.5].map((x) => ({ x, y: 0.5, z: 1.2 }))
      const levelsAt = (receiver: RoomPoint, frequencies: readonly number[]) =>
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
      const scoreGrid = () => {
        const heardRoom = hearRoom(config, placements)
        const hearAt = (receiver: RoomPoint) =>
          heardRoom.hear({
            receiver,
            speakerLevels: levelsAt(receiver, heardRoom.frequencies),
          })
        const calibration = heardRoom.calibrateAt(hearAt(mlp))
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 20; j++) {
            const receiver = {
              x: -7 + (14 * i) / 19,
              y: 1 + (13 * j) / 19,
              z: 1.2,
            }
            heardRoom.deviationsAt(hearAt(receiver), calibration)
          }
        }
      }

      const cost = yardsticksFor(scoreGrid)
      expect(cost, 'yardsticks').toBeLessThan(30)
    },
    HEAVY_TEST_TIMEOUT_MS,
  )
})
