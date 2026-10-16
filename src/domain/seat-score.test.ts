import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  recommendSeat,
  scoreSeat,
  type Config,
  type ScoredSeat,
} from '@/domain'
import { ROOM_WITH_A_BETTER_SEAT } from '@/test/seat-fixtures'
import { V1_LINKS } from '@/test/share-link-fixtures'

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
    // The MLP, 2.28 m back: Left and Right at 26°, ideal. A meter from the
    // front wall they are about 52° out, outside even the acceptable range.
    const ideal = scoreSeat(config, { x: 0, y: 2.28, z: 1.2 })
    const tooClose = scoreSeat(config, { x: 0, y: 1, z: 1.2 })

    expect(ideal.placementFit).toBe(1)
    expect(tooClose.placementFit).toBeLessThan(1)
    expect(tooClose.score).toBeLessThan(ideal.score)
  })

  it('re-places auto speakers around each seat, so they stay inside their ranges', () => {
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

  it('counts weaker bass than at the MLP, as the calibration stays the MLP’s', () => {
    // Moving the MLP to the null calibrates there, which hides most of
    // the weaker bass; scored from the 38% seat it shows.
    const seat = { x: 0, y: 3, z: 1.2 }
    const fromMlp = scoreSeat(DEFAULT_CONFIG, seat)
    const calibratedThere = scoreSeat(
      { ...DEFAULT_CONFIG, manualPositions: { MLP: seat } },
      seat,
    )

    expect(fromMlp.responseDeviationDb).toBeGreaterThan(
      calibratedThere.responseDeviationDb,
    )
  })
})

describe('recommended seat', () => {
  it('recommends the 38% MLP in the default room: on the center line, and no seat beats it meaningfully (#48)', () => {
    const { recommended, current, offCenterLine, mlpIsRecommended } =
      recommendSeat(DEFAULT_CONFIG)

    expect(recommended).toBe(current)
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

    expect(Math.abs(recommended.position.y - 3)).toBeGreaterThan(0.25)
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

  it('keeps the MLP when no seat is better by more than the model’s precision', () => {
    // The default room: the best seat of the grid, 4.54 m back, is less
    // than a point better than the 38% MLP.
    const { recommended, current, candidates, mlpIsRecommended } =
      recommendSeat(DEFAULT_CONFIG)
    const best = Math.max(...candidates.map((seat) => seat.score))

    expect(best).toBeGreaterThan(current.score)
    expect(best).toBeLessThan(current.score + 0.02)
    expect(recommended).toBe(current)
    expect(mlpIsRecommended).toBe(true)
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

  it('has a column of candidates on the center line in any room width', () => {
    // 2.8 m wide: 2.2 m between the side clearances, which 0.25 m steps
    // would split into an even number of columns, none in the middle.
    for (const width of [2, 2.8, 3.3, 4.5, 15]) {
      const { candidates } = recommendSeat({
        ...DEFAULT_CONFIG,
        room: { ...DEFAULT_CONFIG.room, width },
      })
      const across = [...new Set(candidates.map(({ position }) => position.x))]

      expect(across.filter((x) => x === 0)).toHaveLength(1)
      expect(across.length % 2).toBe(1)
    }
  })

  it('recommends a seat in the largest room with 4 subwoofers and 7 listener-level speakers quickly enough to run live', () => {
    // About 0.4 s under Vitest on a 2024 laptop, and 0.1 s in the default
    // room; the bound only catches a regression to hearing every seat per
    // round, or recomputing the room modes per seat.
    const config: Config = {
      ...DEFAULT_CONFIG,
      room: { length: 15, width: 15, height: 5 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
    }
    analyzeRoom(config)
    const started = performance.now()

    recommendSeat(config)

    expect(performance.now() - started).toBeLessThan(2000)
  })
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

  /** A small, narrow 2.1 room. */
  const narrowStereo = stereo(4, 2.5)
  /** A 2.1 room 5 m wide, the subwoofer in the middle of the front wall. */
  const wideStereo = stereo(6, 5)
  /** A 3.1 room 4 m wide, its subwoofer moved off the center line. */
  const subwooferOffCenter: Config = {
    ...DEFAULT_CONFIG,
    room: { length: 6, width: 4, height: 2.6 },
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
    // About 4.3 points better 0.94 m off the center line.
    const { recommended, current, candidates, offCenterLine } =
      recommendSeat(wideStereo)
    const bestOnCenterLine = bestOf([
      current,
      ...candidates.filter(onCenterLine),
    ])

    expect(Math.abs(recommended.position.x)).toBeCloseTo(0.94, 2)
    expect(recommended).toBe(bestOf(candidates))
    expect(offCenterLine?.centerLine).toBe(bestOnCenterLine)
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
    // 343 / (2 × 4) = 42.9 Hz, whose null runs down the center line.
    const { recommended, offCenterLine } = recommendSeat(subwooferOffCenter)

    expect(recommended.position.x).not.toBe(0)
    expect(offCenterLine?.margin).toBeGreaterThan(0.02)
    expect(offCenterLine?.widthMode?.mode.indices).toEqual({
      length: 0,
      width: 1,
      height: 0,
    })
    expect(offCenterLine?.widthMode?.mode.frequency).toBeCloseTo(42.9, 1)
    expect(offCenterLine?.widthMode?.atCenterLine).toBe('null')
  })

  it('recommends a center-line seat in every symmetric 5.1.2 room tried, as the auto speakers stay symmetric to the room', () => {
    for (const length of [5, 6, 7]) {
      for (const width of [3.5, 4.5, 5.5]) {
        for (const subwoofers of [1, 2] as const) {
          const { recommended } = recommendSeat({
            ...DEFAULT_CONFIG,
            room: { length, width, height: 2.6 },
            layout: { dolbyLayout: '5.1.2', subwoofers },
          })

          expect(recommended.position.x).toBe(0)
        }
      }
    }
  })

  it('counts an MLP on the center line as a center-line seat, and keeps it when no seat beats it meaningfully', () => {
    // The 24 x 15 ft fixture room: its 38% MLP is on the center line and
    // scores about as well as the grid's best center-line seat.
    const config = V1_LINKS.imperialRoom.config as Config
    const { recommended, current, offCenterLine } = recommendSeat(config)

    expect(current.position.x).toBe(0)
    expect(recommended).toBe(current)
    expect(offCenterLine).toBeUndefined()
  })
})
