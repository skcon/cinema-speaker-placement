import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type SubwooferCount,
} from '@/domain'

function withSubwoofers(subwoofers: SubwooferCount): Config {
  return { ...DEFAULT_CONFIG, layout: { dolbyLayout: '5.1', subwoofers } }
}

/** The estimated level nearest to `frequency`, relative to the target there. */
function deviationAt(config: Config, frequency: number): number {
  const { estimated, target } = analyzeRoom(config).response
  const distances = estimated.points.map((p) =>
    Math.abs(p.frequency - frequency),
  )
  const i = distances.indexOf(Math.min(...distances))
  return estimated.points[i]!.level - target[i]!.level
}

describe('estimated response at the MLP', () => {
  const { response } = analyzeRoom(DEFAULT_CONFIG)

  it('covers 20-200 Hz on a log axis, every 16th point a base-10 third-octave frequency', () => {
    const frequencies = response.estimated.points.map((p) => p.frequency)

    expect(frequencies).toHaveLength(161)
    expect(frequencies[0]).toBe(20)
    expect(frequencies.at(-1)).toBeCloseTo(200, 10)
    // 20·10^(k/10): 25.18, 63.25, 100.24 Hz
    expect(frequencies[16]).toBeCloseTo(25.179, 3)
    expect(frequencies[80]).toBeCloseTo(63.246, 3)
    expect(frequencies[112]).toBeCloseTo(100.237, 3)
  })

  it('is a finite level at every frequency', () => {
    for (const { level } of response.estimated.points) {
      expect(Number.isFinite(level)).toBe(true)
    }
  })

  it('is level-matched to the target: its average deviation from the target is 0 dB', () => {
    for (const targetCurve of ['flat', 'house'] as const) {
      const { estimated, target } = analyzeRoom({
        ...DEFAULT_CONFIG,
        targetCurve,
      }).response
      const deviations = estimated.points.map(
        (p, i) => p.level - target[i]!.level,
      )
      const mean = deviations.reduce((a, b) => a + b) / deviations.length
      expect(mean).toBeCloseTo(0, 9)
    }
  })

  it('comes from the room modes only so far, with the model parameters it assumed', () => {
    expect(response.estimated.components).toEqual(['room-modes'])
    const { speedOfSound, reverberationTime, modalBandwidth } =
      response.estimated.model
    expect([speedOfSound, reverberationTime]).toEqual([343, 0.5])
    // 3·ln 10 / (0.5·π) ≈ 2.2/0.5
    expect(modalBandwidth).toBeCloseTo(4.398, 3)
  })

  it('peaks or dips by more than the ±3 dB band somewhere in the default room', () => {
    const outside = response.estimated.points.filter(
      (p, i) => Math.abs(p.level - response.target[i]!.level) > 3,
    )
    expect(outside.length).toBeGreaterThan(0)
  })

  it('loses the first length mode (28.6 Hz) with two subwoofers at the front and back walls', () => {
    // The two subwoofers sit at mirrored distances from the front and back
    // walls, where an odd length mode has opposite signs: they cancel it.
    expect(
      deviationAt(withSubwoofers(1), 343 / 12) -
        deviationAt(withSubwoofers(2), 343 / 12),
    ).toBeGreaterThan(10)
  })

  it('changes with the room and with the subwoofer count', () => {
    const levels = (config: Config) =>
      analyzeRoom(config).response.estimated.points.map((p) => p.level)
    const longer = {
      ...DEFAULT_CONFIG,
      room: { ...DEFAULT_CONFIG.room, length: 7 },
    }

    expect(levels(longer)).not.toEqual(levels(DEFAULT_CONFIG))
    expect(levels(withSubwoofers(4))).not.toEqual(levels(withSubwoofers(1)))
  })
})

describe('target curve in the analysis', () => {
  it('follows the config: flat by default, the house curve when chosen', () => {
    const flat = analyzeRoom(DEFAULT_CONFIG).response
    const house = analyzeRoom({
      ...DEFAULT_CONFIG,
      targetCurve: 'house',
    }).response

    expect(flat.targetCurve).toBe('flat')
    expect(flat.target.every((p) => p.level === 0)).toBe(true)
    expect(house.targetCurve).toBe('house')
    // 6 / (1 + 0.2²) at 20 Hz
    expect(house.target[0]?.level).toBeCloseTo(5.769, 3)
    expect(house.target.map((p) => p.frequency)).toEqual(
      house.estimated.points.map((p) => p.frequency),
    )
  })
})

describe('room modes in the analysis', () => {
  it('lists the modes up to 200 Hz, lowest first, for naming peaks and dips', () => {
    const { roomModes } = analyzeRoom(DEFAULT_CONFIG)

    expect(
      roomModes.slice(0, 3).map(({ kind, frequency }) => [kind, frequency]),
    ).toEqual([
      ['axial', expect.closeTo(28.583, 3)],
      ['axial', expect.closeTo(38.111, 3)],
      ['tangential', expect.closeTo(47.639, 3)],
    ])
    expect(roomModes.at(-1)!.frequency).toBeLessThanOrEqual(200)
  })
})
