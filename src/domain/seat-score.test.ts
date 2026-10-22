import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  recommendSeat,
  scoreSeat,
  seatScoreInput,
  seatScoreKey,
  SEATING_DISTANCE,
  SUBWOOFER_COUNTS,
  V1_DOLBY_LAYOUTS,
  withAutoPlacement,
  type Config,
  type DolbyLayout,
  type ScoredSeat,
  type SubwooferCount,
} from '@/domain'
import { yardsticksFor } from '@/test/relative-speed'
import { HEAVY_TEST_TIMEOUT_MS } from '@/test/timeouts'
import { ROOM_WITH_A_BETTER_SEAT } from '@/test/seat-fixtures'
import { V3_LINKS } from '@/test/share-link-fixtures'

/** The default room with the front speakers left by hand where auto-place puts them today. */
function withManualFront(): Config {
  const { speakers } = analyzeRoom(DEFAULT_CONFIG)
  const at = (channel: string) =>
    speakers.find((speaker) => speaker.channel === channel)!.position
  return {
    ...DEFAULT_CONFIG,
    manualPositions: { L: at('L'), C: at('C'), R: at('R') },
  }
}

describe('seat score', () => {
  it('scores a seat on the first length mode’s null (halfway back) worse than one off it', () => {
    // The default 6 m room's single subwoofer stands at the front wall, so
    // it drives the 28.6 Hz length mode, whose node is 3 m back.
    const onNull = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 3, z: 1.2 })
    const offNull = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 2.1, z: 1.2 })

    expect(onNull.score).toBeLessThan(offNull.score)
    expect(onNull.responseDeviationDb).toBeGreaterThan(
      offNull.responseDeviationDb,
    )
  })

  it('scores a seat that puts manual speakers outside their placement ranges worse than one that keeps them ideal', () => {
    const config = withManualFront()
    // The MLP, 2.28 m back: Left and Right at 29°, ideal. A meter from the
    // front wall they are about 63° out, outside even the acceptable range.
    const ideal = scoreSeat(config, { x: 0, y: 2.28, z: 1.2 })
    const tooClose = scoreSeat(config, { x: 0, y: 1, z: 1.2 })

    expect(ideal.placementFit).toBe(1)
    expect(tooClose.placementFit).toBeLessThan(1)
    expect(tooClose.score).toBeLessThan(ideal.score)
  })

  it('re-places auto speakers for each seat’s distance from the front wall, so they stay inside their ranges from a center-line seat', () => {
    expect(scoreSeat(DEFAULT_CONFIG, { x: 0, y: 1, z: 1.2 }).placementFit).toBe(
      1,
    )
  })

  it('places auto speakers symmetric to the room, around the seat’s projection onto the center line, so an off-center seat hears them at skewed angles (ADR 0005, amendment)', () => {
    // 0.84 m left of the center line, 1.84 m back: the auto speakers stay
    // where they are for a seat on the center line at 1.84 m, so Left and
    // the Left Surround are much nearer and at other angles than Dolby's.
    const centered = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 1.84, z: 1.2 })
    const offCenter = scoreSeat(DEFAULT_CONFIG, { x: -0.84, y: 1.84, z: 1.2 })

    expect(centered.placementFit).toBe(1)
    expect(offCenter.placementFit).toBeLessThan(0.75)
  })

  it('scores a seat next to a side wall lower on placement fit than one on the center line', () => {
    const centered = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 2.28, z: 1.2 })
    const atWall = scoreSeat(DEFAULT_CONFIG, { x: 1.5, y: 2.28, z: 1.2 })

    expect(centered.placementFit).toBe(1)
    expect(atWall.placementFit).toBeLessThan(0.75)
  })
})

describe('recommended seat', () => {
  it('recommends the 38% MLP in the default room: on the center line, and no seat beats it meaningfully (#48)', () => {
    const { recommended, current, offCenterLine, mlpIsRecommended } =
      recommendSeat(DEFAULT_CONFIG)

    expect(recommended).toEqual(current)
    expect(recommended.position.x).toBe(0)
    expect(recommended.position.y).toBeCloseTo(2.28, 9)
    expect(mlpIsRecommended).toBe(true)
    expect(offCenterLine).toBeUndefined()
  })

  it('recommends a seat better than the 38% MLP when there is one', () => {
    const { recommended, current, mlpIsRecommended } = recommendSeat(
      ROOM_WITH_A_BETTER_SEAT,
    )

    expect(recommended.score).toBeGreaterThan(current.score + 0.02)
    expect(recommended.position.x).toBe(0)
    expect(mlpIsRecommended).toBe(false)
  })

  it('stays off the first length mode’s null', () => {
    const { recommended } = recommendSeat(ROOM_WITH_A_BETTER_SEAT)

    // Its null runs across the room halfway back.
    const halfway = ROOM_WITH_A_BETTER_SEAT.room.length / 2
    expect(Math.abs(recommended.position.y - halfway)).toBeGreaterThan(0.25)
  })

  it('is still the recommended seat once the MLP is moved there', () => {
    const { recommended } = recommendSeat(ROOM_WITH_A_BETTER_SEAT)
    const moved = recommendSeat({
      ...ROOM_WITH_A_BETTER_SEAT,
      manualPositions: { MLP: recommended.position },
    })

    expect(moved.mlpIsRecommended).toBe(true)
    expect(moved.recommended.position).toEqual(recommended.position)
  })

  it('keeps the 38% seed seat when no seat is better by more than the model’s precision', () => {
    // The default room: the best seat of the grid, 4.54 m back, is less
    // than a point better than the 38% seed seat, wherever the MLP is.
    const seed = { x: 0, y: 6 * 0.38, z: 1.2 }
    const { recommended, candidates } = recommendSeat({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 4.5, z: 1.2 } },
    })
    const best = Math.max(...candidates.map((seat) => seat.score))
    const seedScore = scoreSeat(DEFAULT_CONFIG, seed).score

    expect(best).toBeGreaterThan(seedScore)
    expect(best).toBeLessThan(seedScore + 0.02)
    expect(recommended.position).toEqual(seed)
  })

  it('only considers seats inside the MLP’s wall clearance, at ear height', () => {
    const { candidates } = recommendSeat(DEFAULT_CONFIG)

    for (const { position } of candidates) {
      expect(Math.abs(position.x)).toBeLessThanOrEqual(4.5 / 2 - 0.3 + 1e-9)
      expect(position.y).toBeGreaterThanOrEqual(0.3 - 1e-9)
      expect(position.y).toBeLessThanOrEqual(6 - 0.3 + 1e-9)
      expect(position.z).toBe(1.2)
    }
    expect(candidates.length).toBeGreaterThan(100)
  })

  it(
    'has a column of candidates on the center line in any room width',
    () => {
      // 2.8 m wide: 2.2 m between the side clearances, which 0.25 m steps
      // would split into an even number of columns, none in the middle.
      // Heavy: the 15 m wide room scores a grid of over a thousand seats.
      for (const width of [2, 2.8, 3.3, 4.5, 15]) {
        const { candidates } = recommendSeat({
          ...DEFAULT_CONFIG,
          room: { ...DEFAULT_CONFIG.room, width },
        })
        const across = [
          ...new Set(candidates.map(({ position }) => position.x)),
        ]

        expect(across.filter((x) => x === 0)).toHaveLength(1)
        expect(across.length % 2).toBe(1)
      }
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  it(
    'recommends a seat in the largest room with 4 subwoofers and 7 listener-level speakers quickly enough to run live',
    () => {
      // About 9 yardsticks (0.4 s on a 2024 laptop), and 0.1 s in the
      // default room. The bound, twice that, fails on a 3x slower hot loop
      // (about 22) and on hearing every seat per round or recomputing the
      // room modes per seat (hundreds). Heavy: the work runs three times.
      const config: Config = {
        ...DEFAULT_CONFIG,
        room: { length: 15, width: 15, height: 5 },
        layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
      }
      analyzeRoom(config)

      const cost = yardsticksFor(() => recommendSeat(config))
      expect(cost, 'yardsticks').toBeLessThan(18)
    },
    HEAVY_TEST_TIMEOUT_MS,
  )
})

describe('recommended seat on the center line (ADR 0005)', () => {
  /** The best of these seats, ties to the first. */
  const bestOf = (seats: readonly ScoredSeat[]) =>
    seats.reduce((best, seat) => (seat.score > best.score ? seat : best))
  const onCenterLine = ({ position }: ScoredSeat) => position.x === 0

  /**
   * Stereo (2.1) rooms: without surrounds, Left and Right stay inside
   * their acceptable range from seats a little off the center line, so an
   * off-center seat can win on bass alone.
   */
  const stereo = (
    length: number,
    width: number,
    manualPositions: Config['manualPositions'] = {},
  ): Config => ({
    ...DEFAULT_CONFIG,
    room: { length, width, height: 2.6 },
    layout: { dolbyLayout: '2.1', subwoofers: 1 },
    manualPositions,
  })

  /**
   * A small, narrow 2.1 room. 4 x 2.5 m until #121: with Left and Right at
   * 29° its best off-center seat beats the center line meaningfully there.
   */
  const narrowStereo = stereo(4.25, 2.5)
  /** A 2.1 room 5 m wide, the subwoofer in the middle of the front wall. */
  const wideStereo = stereo(6, 5)
  /**
   * A 3.1 room 4.5 m wide, its subwoofer moved off the center line. 4 m wide
   * until #121: with Left and Right at 29° that room kept its auto MLP.
   */
  const subwooferOffCenter: Config = {
    ...DEFAULT_CONFIG,
    room: { length: 6, width: 4.5, height: 2.6 },
    layout: { dolbyLayout: '3.1', subwoofers: 1 },
    manualPositions: { Sub1: { x: 1.5, y: 3, z: 0.3 } },
  }

  it('recommends the best center-line seat when an off-center seat scores better, but not meaningfully', () => {
    const { recommended, current, candidates, offCenterLine } =
      recommendSeat(narrowStereo)
    const best = bestOf(candidates)
    const bestOnCenterLine = bestOf(candidates.filter(onCenterLine))

    // The grid's best seat is off the center line, within the precision.
    expect(best.position.x).not.toBe(0)
    expect(best.score).toBeGreaterThan(bestOnCenterLine.score)
    expect(best.score - bestOnCenterLine.score).toBeLessThan(0.02)
    expect(recommended).toBe(bestOnCenterLine)
    expect(recommended.score).toBeGreaterThan(current.score + 0.02)
    expect(offCenterLine).toBeUndefined()
  })

  it('keeps a center-line seat recommended once the MLP is moved there', () => {
    const { recommended } = recommendSeat(narrowStereo)
    const moved = recommendSeat({
      ...narrowStereo,
      manualPositions: { MLP: recommended.position },
    })

    expect(moved.mlpIsRecommended).toBe(true)
    expect(moved.recommended.position.x).toBe(0)
  })

  it('recommends an off-center seat that beats every center-line seat meaningfully, with the margin and the center-line seat it beat', () => {
    // About 5.8 points better 0.94 m off the center line (4.3 before #121).
    const { recommended, current, candidates, offCenterLine } =
      recommendSeat(wideStereo)
    const bestOnCenterLine = bestOf([
      current,
      ...candidates.filter(onCenterLine),
    ])

    expect(Math.abs(recommended.position.x)).toBeCloseTo(0.94, 2)
    expect(recommended).toBe(bestOf(candidates))
    expect(offCenterLine?.centerLine).toEqual(bestOnCenterLine)
    expect(offCenterLine?.margin).toBeCloseTo(
      recommended.score - bestOnCenterLine.score,
      12,
    )
    expect(offCenterLine?.margin).toBeGreaterThan(0.02)
  })

  it('names a width mode strongest on the center line when the bass is smoother off it', () => {
    // The subwoofer in the middle of the front wall drives the even width
    // modes, which are strongest on the center line: the second one is at
    // 343 / 5 = 68.6 Hz.
    const { recommended, offCenterLine } = recommendSeat(wideStereo)

    expect(recommended.responseDeviationDb).toBeLessThan(
      offCenterLine!.centerLine.responseDeviationDb,
    )
    expect(offCenterLine?.widthMode?.mode.indices).toEqual({
      length: 0,
      width: 2,
      height: 0,
    })
    expect(offCenterLine?.widthMode?.mode.frequency).toBeCloseTo(68.6, 1)
    expect(offCenterLine?.widthMode?.atCenterLine).toBe('strongest')
  })

  it('names a width mode with a null on the center line when an off-center subwoofer drives it', () => {
    // Off the center line the subwoofer drives the first width mode,
    // 343 / (2 × 4.5) = 38.1 Hz, whose null runs down the center line.
    const { recommended, offCenterLine } = recommendSeat(subwooferOffCenter)

    expect(recommended.position.x).not.toBe(0)
    expect(offCenterLine?.margin).toBeGreaterThan(0.02)
    expect(offCenterLine?.widthMode?.mode.indices).toEqual({
      length: 0,
      width: 1,
      height: 0,
    })
    expect(offCenterLine?.widthMode?.mode.frequency).toBeCloseTo(38.1, 1)
    expect(offCenterLine?.widthMode?.atCenterLine).toBe('null')
  })

  it(
    'recommends a center-line seat in every symmetric 5.1.2 room tried, as the auto speakers stay symmetric to the room',
    () => {
      // Every length with every width, the subwoofer count alternating like
      // a checkerboard, so each length and each width is tried with one
      // subwoofer and with two: half the seat grids of trying both counts
      // in every room (#93). Heavy all the same: nine seat grids.
      const lengths = [5, 6, 7]
      const widths = [3.5, 4.5, 5.5]
      lengths.forEach((length, i) =>
        widths.forEach((width, j) => {
          const subwoofers = (i + j) % 2 === 0 ? 1 : 2
          const { recommended } = recommendSeat({
            ...DEFAULT_CONFIG,
            room: { length, width, height: 2.6 },
            layout: { dolbyLayout: '5.1.2', subwoofers },
          })

          expect(recommended.position.x).toBe(0)
        }),
      )
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  it('counts the 38% seed seat as a center-line seat, and keeps it when no seat beats it meaningfully', () => {
    // The 24 x 15 ft fixture room: its 38% MLP is on the center line and
    // scores about as well as the grid's best center-line seat.
    const config = V3_LINKS.imperialRoom.config as Config
    const { recommended, current, offCenterLine } = recommendSeat(config)

    expect(current.position.x).toBe(0)
    expect(recommended).toEqual(current)
    expect(offCenterLine).toBeUndefined()
  })
})

describe('seating distances (#119)', () => {
  /** A room `length` deep and `width` wide, 2.6 m high, with a layout. */
  const roomOf = (
    length: number,
    width: number,
    dolbyLayout: DolbyLayout = DEFAULT_CONFIG.layout.dolbyLayout,
    subwoofers: SubwooferCount = DEFAULT_CONFIG.layout.subwoofers,
  ): Config => ({
    ...DEFAULT_CONFIG,
    room: { length, width, height: 2.6 },
    layout: { dolbyLayout, subwoofers },
  })

  /** The seat's distance from the nearest listener-level speaker or subwoofer. */
  const nearestSpeaker = ({ distances }: ScoredSeat) =>
    Math.min(
      ...[...distances.speakers, ...distances.subwoofers].map(
        ({ distance }) => distance,
      ),
    )

  /** Expect `seat` to keep every seating distance. */
  const expectSeatingDistancesKept = (seat: ScoredSeat, room: string) => {
    expect(nearestSpeaker(seat), room).toBeGreaterThanOrEqual(0.5 - 1e-9)
    expect(seat.distances.fromWall, room).toBeGreaterThanOrEqual(0.5 - 1e-9)
    expect(seat.distances.behindFrontStage, room).toBeGreaterThanOrEqual(
      1.5 - 1e-9,
    )
    expect(seat.distances.shortfall, room).toBe(0)
  }

  it('are RP22’s Level 1 head clearance from speakers and walls, and our 1.5 m behind the front stage', () => {
    expect(SEATING_DISTANCE).toMatchObject({
      fromSpeaker: 0.5,
      fromWall: 0.5,
      behindFrontStage: 1.5,
    })
    expect(SEATING_DISTANCE.citations).toContainEqual(
      expect.objectContaining({ source: 'RP22' }),
    )
    expect(SEATING_DISTANCE.note).toMatch(/behindFrontStage is ours/)
  })

  it('expose the stage installed for a seat: every speaker’s and subwoofer’s distance, the L–R spread and the distance behind the front stage', () => {
    // The default room's 38% MLP, 2.28 m back: the front stage on the
    // 0.5 m line, 1.78 m ahead, Left and Right at ±29° (±26° before #121,
    // a 1.74 m spread; now 1.97 m, about their distance); the subwoofer on
    // the floor at the front wall, 0.3 m off it and 0.3 m up.
    const { distances } = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 2.28, z: 1.2 })
    const ahead = 2.28 - 0.5
    const tan29 = Math.tan((29 * Math.PI) / 180)
    const distanceOf = (id: string) =>
      [...distances.speakers, ...distances.subwoofers].find(
        (item) => item.id === id,
      )!.distance

    expect(distances.speakers.map(({ id }) => id)).toEqual([
      'L',
      'C',
      'R',
      'Ls',
      'Rs',
    ])
    expect(distanceOf('C')).toBeCloseTo(ahead, 9)
    expect(distanceOf('L')).toBeCloseTo(
      ahead / Math.cos((29 * Math.PI) / 180),
      9,
    )
    expect(distanceOf('R')).toBeCloseTo(distanceOf('L'), 9)
    expect(distances.leftRightSpread).toBeCloseTo(2 * ahead * tan29, 9)
    expect(distanceOf('Sub1')).toBeCloseTo(Math.hypot(2.28 - 0.3, 1.2 - 0.3), 9)
    expect(distances.behindFrontStage).toBeCloseTo(ahead, 9)
    expect(distances.fromWall).toBeCloseTo(4.5 / 2, 9)
    expect(distances.shortfall).toBe(0)
  })

  it('count a seat in front of the front-stage line as in front of it, though its own stage falls back to the wall clearance', () => {
    // 0.4 m from the front wall: the auto stage installed for it stops at
    // the 0.3 m wall clearance, right in front of the seat.
    const { distances } = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 0.4, z: 1.2 })

    expect(distances.behindFrontStage).toBeCloseTo(-0.1, 9)
    expect(distances.shortfall).toBeCloseTo(1.6, 9)
  })

  it('count a manual front speaker farther back than the front-stage line as the front stage', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { C: { x: 0, y: 2, z: 1.2 } },
    }
    const { distances } = scoreSeat(config, { x: 0, y: 3, z: 1.2 })

    expect(distances.behindFrontStage).toBeCloseTo(1, 9)
    expect(distances.shortfall).toBeCloseTo(0.5, 9)
  })

  it('only leave candidates that keep every seating distance', () => {
    const { candidates } = recommendSeat(DEFAULT_CONFIG)

    for (const seat of candidates) {
      expectSeatingDistancesKept(
        seat,
        `(${seat.position.x}, ${seat.position.y})`,
      )
    }
  })

  it('say when the MLP is too close to the front stage, and recommend a seat that keeps the distances', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 1, z: 1.2 } },
    }
    const { recommended, current, mlpIsRecommended, mlpKeepsSeatingDistances } =
      recommendSeat(config)

    expect(current.distances.shortfall).toBeGreaterThan(0)
    expect(mlpKeepsSeatingDistances).toBe(false)
    expect(recommended.position).not.toEqual(current.position)
    expect(mlpIsRecommended).toBe(false)
    expectSeatingDistancesKept(recommended, 'default room, MLP 1 m back')
  })

  it.each([
    // The rooms of the report: wider than long, the TV on the long wall.
    // Before #119 the recommendation was 0.54 m from the front wall in the
    // 4 x 6 m room, 4 cm behind the front stage, on the Center and Sub1.
    { length: 4, width: 6 },
    { length: 5, width: 6.5 },
  ])(
    'keep the recommendation out of the front 25% of a $length x $width m room in every v1 layout',
    ({ length, width }) => {
      for (const dolbyLayout of V1_DOLBY_LAYOUTS) {
        const { recommended } = recommendSeat(
          roomOf(length, width, dolbyLayout),
        )
        const room = `${length} x ${width} m, ${dolbyLayout}`

        expect(recommended.position.y, room).toBeGreaterThan(0.25 * length)
        expectSeatingDistancesKept(recommended, room)
        // Left and Right on their 29° (26° before #121) from at least
        // 1.5 m: no tiny stage.
        expect(recommended.distances.leftRightSpread, room).toBeGreaterThan(
          2 * 1.5 * Math.tan((29 * Math.PI) / 180) - 1e-9,
        )
      }
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  /** The sweep's room lengths and widths, in meters (the report's sweep). */
  const sweepLengths = [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]
  const sweepWidths = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7]

  it.each(sweepLengths.map((length, i) => ({ length, i })))(
    'keep every seating distance in every room $length m long, 3–7 m wide (sweep)',
    ({ length, i }) => {
      // Each room gets one layout and one subwoofer count, stepping
      // through them like a checkerboard, so every v1 layout and every
      // count is tried across the sweep (108 rooms) without scoring every
      // combination in every room.
      sweepWidths.forEach((width, j) => {
        const dolbyLayout = V1_DOLBY_LAYOUTS[(i + j) % V1_DOLBY_LAYOUTS.length]!
        const subwoofers =
          SUBWOOFER_COUNTS[(i + 2 * j) % SUBWOOFER_COUNTS.length]!
        const { recommended } = recommendSeat(
          roomOf(length, width, dolbyLayout, subwoofers),
        )

        expectSeatingDistancesKept(
          recommended,
          `${length} x ${width} m, ${dolbyLayout}, ${subwoofers} sub`,
        )
      })
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  it('recommend the seats that come nearest when no seat of a very small room keeps them', () => {
    // 2.4 m deep: 1.5 m behind the 0.5 m front stage is 2 m back, but
    // 0.5 m from the back wall is no more than 1.9 m back, so no seat keeps
    // both. The seats that come nearest are kept, all equally short.
    const config = roomOf(2.4, 3)
    const { recommended, candidates } = recommendSeat(config)
    const shortfalls = candidates.map(({ distances }) => distances.shortfall)

    expect(candidates.length).toBeGreaterThan(0)
    expect(Math.min(...shortfalls)).toBeGreaterThan(0)
    expect(Math.max(...shortfalls)).toBeCloseTo(Math.min(...shortfalls), 9)
    expect(recommended.distances.shortfall).toBeCloseTo(shortfalls[0]!, 9)
  })
})

describe('recommended seat independent of the MLP and manual positions (#120)', () => {
  const recommendedOf = (config: Config) =>
    recommendSeat(config).recommended.position

  it('gives the default room’s recommended seat with Left manual at (−1.8, 0.5) and with the MLP at 3 m', () => {
    const expected = recommendedOf(DEFAULT_CONFIG)
    const leftManual: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { L: { x: -1.8, y: 0.5, z: 1.2 } },
    }
    const mlpBack: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 3, z: 1.2 } },
    }

    expect(recommendedOf(leftManual)).toEqual(expected)
    expect(recommendedOf(mlpBack)).toEqual(expected)
  })

  it('stays put when the MLP moves or every speaker is manual', () => {
    const expected = recommendSeat(ROOM_WITH_A_BETTER_SEAT)
    const moves: Config['manualPositions'][] = [
      { MLP: { x: 0, y: 1, z: 1.2 } },
      { MLP: { x: 0.6, y: 4, z: 1.2 } },
      {
        L: { x: -1.6, y: 0.4, z: 1.2 },
        C: { x: 0, y: 0.4, z: 1.2 },
        R: { x: 1.2, y: 0.8, z: 1.2 },
        Ls: { x: -1.7, y: 4.5, z: 1.2 },
        Rs: { x: 1.7, y: 2, z: 1.2 },
      },
    ]
    for (const manualPositions of moves) {
      const moved = recommendSeat({
        ...ROOM_WITH_A_BETTER_SEAT,
        manualPositions,
      })

      expect(moved.recommended, JSON.stringify(manualPositions)).toEqual(
        expected.recommended,
      )
      expect(moved.offCenterLine).toEqual(expected.offCenterLine)
      expect(moved.candidates).toEqual(expected.candidates)
    }
  })

  it('reads only the subwoofers of the manual positions, as the bass comes from them', () => {
    const subwooferMoved: Config['manualPositions'] = {
      Sub1: { x: 1.5, y: 3, z: 0.3 },
    }

    expect(
      seatScoreInput({
        ...DEFAULT_CONFIG,
        manualPositions: {
          ...subwooferMoved,
          MLP: { x: 0, y: 3, z: 1.2 },
          L: { x: -1.8, y: 0.5, z: 1.2 },
          Ltm: { x: -1, y: 2, z: 2.6 },
        },
      }),
    ).toEqual({ ...DEFAULT_CONFIG, manualPositions: subwooferMoved })
  })

  it('still scores the current MLP where it is, with the speakers where they are', () => {
    const atSeed = recommendSeat(DEFAULT_CONFIG).current
    const mlpBack = recommendSeat({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 3, z: 1.2 } },
    }).current
    const leftManual = recommendSeat({
      ...DEFAULT_CONFIG,
      manualPositions: { L: { x: -1.8, y: 0.5, z: 1.2 } },
    }).current

    expect(mlpBack.position.y).toBe(3)
    expect(mlpBack.score).not.toBeCloseTo(atSeed.score, 6)
    expect(leftManual.position).toEqual(atSeed.position)
    expect(leftManual.placementFit).toBeLessThan(atSeed.placementFit)
  })

  it('compares the current MLP with the recommended seat, within the meaningful difference, without moving the recommendation', () => {
    // The 6 x 4 m room recommends a seat meaningfully better than its 38%
    // MLP; once the MLP is there, it is the recommended seat.
    const { recommended, mlpWithinMeaningfulDifference } = recommendSeat(
      ROOM_WITH_A_BETTER_SEAT,
    )
    const moved = recommendSeat({
      ...ROOM_WITH_A_BETTER_SEAT,
      manualPositions: { MLP: recommended.position },
    })

    expect(mlpWithinMeaningfulDifference).toBe(false)
    expect(moved.recommended).toEqual(recommended)
    expect(moved.mlpWithinMeaningfulDifference).toBe(true)
    expect(moved.mlpIsRecommended).toBe(true)
  })

  it('calls an MLP just behind the recommended seat within the meaningful difference, not the recommended seat', () => {
    const { recommended } = recommendSeat(DEFAULT_CONFIG)
    const nearby = recommendSeat({
      ...DEFAULT_CONFIG,
      manualPositions: {
        MLP: { ...recommended.position, y: recommended.position.y + 0.1 },
      },
    })

    expect(nearby.recommended).toEqual(recommended)
    expect(nearby.mlpIsRecommended).toBe(false)
    expect(nearby.mlpWithinMeaningfulDifference).toBe(true)
  })

  it('leaves the MLP at the recommended seat after Auto-place in a 4 m long, 6 m wide room', () => {
    // Before #120 Auto-place put the MLP 2.24 m back, and the MLP there
    // recalibrated the score and moved the recommendation to 2.73 m.
    const placed = withAutoPlacement({
      ...DEFAULT_CONFIG,
      room: { length: 4, width: 6, height: 2.6 },
    })
    const { recommended, current, mlpIsRecommended } = recommendSeat(placed)

    expect(mlpIsRecommended).toBe(true)
    expect(current.position).toEqual(recommended.position)
  })

  it('scores a seat the same wherever the MLP is: the calibration is at the 38% seed seat', () => {
    const seat = { x: 0, y: 3, z: 1.2 }

    expect(
      scoreSeat({ ...DEFAULT_CONFIG, manualPositions: { MLP: seat } }, seat),
    ).toEqual(scoreSeat(DEFAULT_CONFIG, seat))
  })
})

describe('seat score input and its memo key (#127)', () => {
  const keyOf = (config: Config) => seatScoreKey(seatScoreInput(config))
  const key = keyOf(DEFAULT_CONFIG)
  const withRoomObjects = (
    roomObjects: Partial<Config['roomObjects']>,
  ): Config => ({
    ...DEFAULT_CONFIG,
    roomObjects: { ...DEFAULT_CONFIG.roomObjects, ...roomObjects },
  })
  const cabinet = {
    name: 'Cabinet',
    width: 1,
    depth: 0.4,
    height: 0.6,
    x: 0,
    y: 0.3,
    rotation: 0,
  } as const
  const door = { kind: 'door', wall: 'left', position: 2, width: 0.9 } as const

  it.each<[string, Partial<Config>]>([
    ['the room', { room: { length: 7, width: 4.5, height: 2.6 } }],
    ['the layout', { layout: { dolbyLayout: '7.1', subwoofers: 2 } }],
    [
      'the subwoofer specs',
      {
        speakerGroups: {
          ...DEFAULT_CONFIG.speakerGroups,
          subwoofers: {
            ...DEFAULT_CONFIG.speakerGroups.subwoofers,
            specs: {
              ...DEFAULT_CONFIG.speakerGroups.subwoofers.specs,
              enclosure: 'ported',
            },
          },
        },
      },
    ],
    ['the target curve', { targetCurve: 'house' }],
    ['the crossover', { crossoverHz: 100 }],
    [
      'a manual subwoofer',
      { manualPositions: { Sub1: { x: 1.5, y: 3, z: 0.3 } } },
    ],
    [
      'the screen, which auto-place reads',
      withRoomObjects({
        screen: {
          kind: 'tv',
          width: 1.44,
          height: 0.81,
          bottomEdge: 0.93,
          x: 0,
          standoff: null,
        },
      }),
    ],
  ])('changes with %s', (_, change) => {
    expect(keyOf({ ...DEFAULT_CONFIG, ...change })).not.toBe(key)
  })

  it.each<[string, Partial<Config>]>([
    ['the units', { units: 'imperial' }],
    ['the MLP', { manualPositions: { MLP: { x: 0, y: 3, z: 1.2 } } }],
    [
      'a listener-level speaker moved by hand',
      { manualPositions: { L: { x: -1.8, y: 0.5, z: 1.2 } } },
    ],
    [
      'an overhead speaker moved by hand',
      { manualPositions: { Ltm: { x: -1, y: 2, z: 2.6 } } },
    ],
    [
      'the seat row size, which follows the MLP',
      withRoomObjects({ seatRow: { width: 3, depth: 1.2 } }),
    ],
    [
      'a furniture box, which is not modelled (ADR 0006)',
      withRoomObjects({ furniture: [cabinet] }),
    ],
    [
      'an opening, which is not modelled (ADR 0006)',
      withRoomObjects({ openings: [door] }),
    ],
    [
      'Speakers follow the seat off, the speakers installed for another seat (#123)',
      { speakersInstalledFor: { x: 0.5, y: 3.5, z: 1.2 } },
    ],
  ])(
    'stays the same with %s, which the recommended seat does not read',
    (_, change) => {
      expect(keyOf({ ...DEFAULT_CONFIG, ...change })).toBe(key)
    },
  )

  it('changes with any other field, even one added later', () => {
    const withNewField = { ...DEFAULT_CONFIG, ampWatts: 100 } as Config

    expect(keyOf(withNewField)).not.toBe(key)
  })

  it('changes with any other room object, even one added later', () => {
    const withNewObject = withRoomObjects({
      rug: { width: 2 },
    } as Partial<Config['roomObjects']>)

    expect(keyOf(withNewObject)).not.toBe(key)
  })

  it('gives configs with the same key the same recommended seat', () => {
    const imperialWithObjects: Config = {
      ...withRoomObjects({
        seatRow: { width: 3, depth: 1.2 },
        furniture: [cabinet],
        openings: [door],
      }),
      units: 'imperial',
    }

    expect(keyOf(imperialWithObjects)).toBe(key)
    expect(recommendSeat(imperialWithObjects).recommended).toEqual(
      recommendSeat(DEFAULT_CONFIG).recommended,
    )
  })

  it('gives the same recommended seat whether the speakers follow the seat or not (#123)', () => {
    const held: Config = {
      ...DEFAULT_CONFIG,
      speakersInstalledFor: { x: 0.5, y: 3.5, z: 1.2 },
    }
    const { recommended, offCenterLine, candidates } = recommendSeat(held)
    const following = recommendSeat(DEFAULT_CONFIG)

    expect(recommended).toEqual(following.recommended)
    expect(offCenterLine).toEqual(following.offCenterLine)
    expect(candidates).toEqual(following.candidates)
  })
})

describe('the current MLP with Speakers follow the seat off (#123)', () => {
  it('is scored with the auto speakers where they are installed, not around the MLP', () => {
    const mlp = { x: 0, y: 3, z: 1.2 }
    const installedFor = { x: 0, y: 2, z: 1.2 }
    const following: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: mlp },
    }
    const held: Config = { ...following, speakersInstalledFor: installedFor }

    const { current } = recommendSeat(held)

    expect(current.position).toEqual(mlp)
    expect(current.score).not.toBeCloseTo(
      recommendSeat(following).current.score,
      6,
    )
    // As if the speakers were installed there by hand.
    expect(current.distances).toEqual(
      recommendSeat({
        ...following,
        manualPositions: {
          ...Object.fromEntries(
            analyzeRoom({
              ...following,
              manualPositions: { MLP: installedFor },
            }).speakers.map(({ channel, position }) => [channel, position]),
          ),
          MLP: mlp,
        },
      }).current.distances,
    )
  })
})
