import { describe, expect, it } from 'vitest'
import type { Room, RoomPoint } from './room'
import { yardsticksFor } from '@/test/relative-speed'
import { HEAVY_TEST_TIMEOUT_MS } from '@/test/timeouts'
import { prepareModalResponse, roomModes } from './room-modes'

/** The level of a complex pressure, in dB (re 1). */
function db({ re, im }: { re: number; im: number }): number {
  return 20 * Math.log10(Math.hypot(re, im))
}

/** No filter (1) for every source at every frequency. */
function unfiltered(
  sources: readonly unknown[],
  frequencies: readonly number[],
) {
  return sources.map(() => frequencies.map(() => ({ re: 1, im: 0 })))
}

/** Frequencies from `low` to `high` Hz in `step` Hz steps. */
function sweep(low: number, high: number, step: number): number[] {
  const count = Math.round((high - low) / step)
  return Array.from({ length: count + 1 }, (_, i) => low + i * step)
}

/** The default room: 6 m long, 4.5 m wide, 2.6 m high. */
const ROOM: Room = { length: 6, width: 4.5, height: 2.6 }

/**
 * Worked by hand with c = 343 m/s (docs/research/dolby-speaker-placement.md
 * section 8, item 1): f = (c/2)·√((nL/L)² + (nW/W)² + (nH/H)²).
 */
const HAND_COMPUTED = [
  // Axial: f = n·c/(2L).
  { length: 1, width: 0, height: 0, kind: 'axial', hz: 343 / 12 }, // 28.58
  { length: 0, width: 1, height: 0, kind: 'axial', hz: 343 / 9 }, // 38.11
  { length: 2, width: 0, height: 0, kind: 'axial', hz: 343 / 6 }, // 57.17
  { length: 0, width: 0, height: 1, kind: 'axial', hz: 343 / 5.2 }, // 65.96
  // Tangential: 171.5·√(1/36 + 1/20.25) = 171.5·7.5/27.
  { length: 1, width: 1, height: 0, kind: 'tangential', hz: 47.6389 },
  // Tangential: 171.5·√(1/36 + 1/6.76).
  { length: 1, width: 0, height: 1, kind: 'tangential', hz: 71.8883 },
  // Oblique: 171.5·√(1/36 + 1/20.25 + 1/6.76).
  { length: 1, width: 1, height: 1, kind: 'oblique', hz: 81.3658 },
] as const

describe('room modes of a rectangular room', () => {
  const modes = roomModes(ROOM, 200)

  it.each(HAND_COMPUTED)(
    'has the $kind mode ($length, $width, $height) at $hz Hz',
    ({ hz, kind, ...indices }) => {
      const mode = modes.find(
        (m) =>
          m.indices.length === indices.length &&
          m.indices.width === indices.width &&
          m.indices.height === indices.height,
      )
      expect(mode?.kind).toBe(kind)
      expect(mode?.frequency).toBeCloseTo(hz, 3)
    },
  )

  it('starts at the lowest mode, the first length mode, and goes up in frequency', () => {
    expect(modes[0]?.frequency).toBeCloseTo(28.5833, 3)
    const frequencies = modes.map((m) => m.frequency)
    expect(frequencies).toEqual(frequencies.toSorted((a, b) => a - b))
  })

  it('has no mode above the highest frequency asked for, and none at 0 Hz', () => {
    expect(roomModes(ROOM, 40).map((m) => m.frequency)).toEqual([
      expect.closeTo(343 / 12, 6),
      expect.closeTo(343 / 9, 6),
    ])
  })

  it('counts modes about as the Weyl estimate predicts for a large room', () => {
    // N(f) ≈ 4πVf³/(3c³) + πSf²/(4c²) + Lf/(8c), with S the wall area and
    // L the edge length (Kuttruff, Room Acoustics, ch. 3): for a
    // 10 x 8 x 4 m room up to 150 Hz, V = 320 m³, S = 304 m², L = 88 m,
    // so N ≈ 112.1 + 45.7 + 4.8 ≈ 162.6.
    const count = roomModes({ length: 10, width: 8, height: 4 }, 150).length
    expect(count).toBeGreaterThan(162.6 * 0.95)
    expect(count).toBeLessThan(162.6 * 1.05)
  })
})

describe('the pressure a source makes at a receiver through the room modes', () => {
  // A long, narrow room: its first length mode, 343/30 = 11.43 Hz, sits
  // alone (the next mode is the second length mode at 22.87 Hz).
  const LONG_ROOM: Room = { length: 15, width: 2, height: 2 }
  const FIRST_LENGTH_MODE = 343 / 30
  const SECOND_LENGTH_MODE = 343 / 15
  const atFrontWall: RoomPoint = { x: 0, y: 0, z: 0 }
  const atBackWall: RoomPoint = { x: 0, y: 15, z: 0 }
  const halfwayBack: RoomPoint = { x: 0, y: 7.5, z: 0 }

  function prepare(sources: RoomPoint[], frequencies: number[]) {
    return prepareModalResponse({
      room: LONG_ROOM,
      sources,
      sourceFilters: unfiltered(sources, frequencies),
      frequencies,
    })
  }

  function levels(source: RoomPoint, receiver: RoomPoint, at: number[]) {
    return prepare([source], at).pressureAt(receiver).map(db)
  }

  /** The index of the frequency nearest `target`. */
  function nearest(frequencies: number[], target: number) {
    const distances = frequencies.map((f) => Math.abs(f - target))
    return distances.indexOf(Math.min(...distances))
  }

  it('peaks at the mode frequency, f = c/2L', () => {
    // Up to 40 Hz, so modes up to 60 Hz are summed; the peak is sought
    // below the second length mode.
    const frequencies = sweep(5, 40, 0.01)
    const response = levels(atFrontWall, atBackWall, frequencies)
    const belowSecond = response.filter((_, i) => frequencies[i]! < 18)
    const peak = response.indexOf(Math.max(...belowSecond))

    // The tails of the higher modes pull the peak slightly off the
    // mode's own frequency.
    expect(Math.abs(frequencies[peak]! - FIRST_LENGTH_MODE)).toBeLessThan(0.25)
  })

  it('gives each mode a half-power bandwidth of about 2.2/T: 4.4 Hz at T = 0.5 s', () => {
    const frequencies = sweep(5, 18, 0.01)
    const response = levels(atFrontWall, atBackWall, frequencies)
    const top = Math.max(...response)
    const withinHalfPower = frequencies.filter(
      (_, i) => response[i]! >= top - 3,
    )
    const width = withinHalfPower.at(-1)! - withinHalfPower[0]!

    expect(width).toBeGreaterThan(2.2 / 0.5 - 0.5)
    expect(width).toBeLessThan(2.2 / 0.5 + 0.5)
  })

  it('hardly excites a length mode at a receiver on its node, halfway back', () => {
    const frequencies = sweep(5, 60, 0.01)
    const i = nearest(frequencies, FIRST_LENGTH_MODE)
    const atNode = levels(atFrontWall, halfwayBack, frequencies)[i]!
    const atWall = levels(atFrontWall, atBackWall, frequencies)[i]!

    // Only the other modes' tails reach the node.
    expect(atWall - atNode).toBeGreaterThan(15)
  })

  it('sums modes up to 1.5 × the highest frequency asked for', () => {
    const { modes } = prepare([atFrontWall], sweep(20, 60, 1))

    expect(modes.at(-1)!.frequency).toBeLessThanOrEqual(90)
    expect(modes.at(-1)!.frequency).toBeGreaterThan(60)
  })

  it('adds up several sources, each heard as if alone (superposition)', () => {
    const frequencies = sweep(20, 60, 5)
    const second = { x: 0.5, y: 11, z: 0.3 }
    const together = prepare([atFrontWall, second], frequencies).pressureAt(
      halfwayBack,
    )
    const first = prepare([atFrontWall], frequencies).pressureAt(halfwayBack)
    const alone = prepare([second], frequencies).pressureAt(halfwayBack)

    together.forEach(({ re, im }, i) => {
      expect(re).toBeCloseTo(first[i]!.re + alone[i]!.re, 12)
      expect(im).toBeCloseTo(first[i]!.im + alone[i]!.im, 12)
    })
  })

  it('multiplies each source by its own filter (enclosure roll-off) before summing', () => {
    const frequencies = [20, 30, 40]
    const second = { x: 0.5, y: 11, z: 0.3 }
    // Front source halved, second source turned by 90° (times j).
    const filters = [
      frequencies.map(() => ({ re: 0.5, im: 0 })),
      frequencies.map(() => ({ re: 0, im: 1 })),
    ]
    const filtered = prepareModalResponse({
      room: LONG_ROOM,
      sources: [atFrontWall, second],
      sourceFilters: filters,
      frequencies,
    }).pressureAt(halfwayBack)
    const first = prepare([atFrontWall], frequencies).pressureAt(halfwayBack)
    const alone = prepare([second], frequencies).pressureAt(halfwayBack)

    filtered.forEach(({ re, im }, i) => {
      // 0.5·p₁ + j·p₂ = (0.5·re₁ − im₂) + j·(0.5·im₁ + re₂)
      expect(re).toBeCloseTo(0.5 * first[i]!.re - alone[i]!.im, 12)
      expect(im).toBeCloseTo(0.5 * first[i]!.im + alone[i]!.re, 12)
    })
  })

  it('tells which modes the sources excite, and which they cancel', () => {
    const { modes, excited } = prepare(
      [
        { x: 0, y: 0.3, z: 0 },
        { x: 0, y: 14.7, z: 0 },
      ],
      sweep(5, 30, 1),
    )
    const firstLength = modes.findIndex(
      (m) => m.indices.length === 1 && m.kind === 'axial',
    )
    const secondLength = modes.findIndex(
      (m) => m.indices.length === 2 && m.kind === 'axial',
    )
    expect(excited[firstLength]).toBe(false)
    expect(excited[secondLength]).toBe(true)
  })

  it('knows the lowest mode the sources excite: one source excites the first length mode', () => {
    const { lowestExcitedMode } = prepare([atFrontWall], sweep(5, 60, 1))

    expect(lowestExcitedMode?.frequency).toBeCloseTo(FIRST_LENGTH_MODE, 6)
  })

  it('skips a mode the sources cancel: mirrored front and back sources excite the second length mode first', () => {
    const { lowestExcitedMode } = prepare(
      [
        { x: 0, y: 0.3, z: 0 },
        { x: 0, y: 14.7, z: 0 },
      ],
      sweep(5, 60, 1),
    )

    expect(lowestExcitedMode?.frequency).toBeCloseTo(SECOND_LENGTH_MODE, 6)
  })

  it(
    'hears a 20 x 20 receiver grid in the largest room with 4 sources quickly, for the seat score (#14)',
    () => {
      // About 13 yardsticks (0.45 s on a 2024 laptop). The bound, twice
      // that, fails on a 3x slower modal sum (about 34) and on recomputing
      // everything per receiver (far more). Heavy: the work runs three times.
      const room = { length: 15, width: 15, height: 5 }
      const frequencies = Array.from(
        { length: 161 },
        (_, i) => 20 * 10 ** (i / 160),
      )
      const sources = [
        { x: 0, y: 0.3, z: 0.3 },
        { x: -7.2, y: 7.5, z: 0.3 },
        { x: 7.2, y: 7.5, z: 0.3 },
        { x: 0, y: 14.7, z: 0.3 },
      ]
      const hearGrid = () => {
        const prepared = prepareModalResponse({
          room,
          sources,
          sourceFilters: unfiltered(sources, frequencies),
          frequencies,
        })
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 20; j++) {
            prepared.pressureAt({
              x: -7 + (14 * i) / 19,
              y: 1 + (13 * j) / 19,
              z: 1.2,
            })
          }
        }
      }

      const cost = yardsticksFor(hearGrid)
      expect(cost, 'yardsticks').toBeLessThan(26)
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  it('is the same with source and receiver swapped (reciprocity)', () => {
    const source = { x: -0.4, y: 2.1, z: 0.3 }
    const receiver = { x: 0.3, y: 9.7, z: 1.2 }
    const frequencies = sweep(20, 60, 5)

    const forward = levels(source, receiver, frequencies)
    const backward = levels(receiver, source, frequencies)

    expect(backward).toHaveLength(frequencies.length)
    backward.forEach((level, i) => expect(level).toBeCloseTo(forward[i]!, 9))
  })
})
