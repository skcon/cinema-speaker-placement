import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  recommendSeat,
  scoreSeat,
  type Config,
} from '@/domain'
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

  it('scores a seat where a wall squeezes an auto speaker up against the listener lower on placement fit, after Dolby’s equidistance', () => {
    // 0.45 m from the right wall's clearance line, the Right Surround at
    // 115° can only be placed half a meter away, though the fronts are 2 m off.
    const centered = scoreSeat(DEFAULT_CONFIG, { x: 0, y: 2.28, z: 1.2 })
    const atWall = scoreSeat(DEFAULT_CONFIG, { x: 1.5, y: 2.28, z: 1.2 })

    expect(centered.placementFit).toBe(1)
    expect(atWall.placementFit).toBeLessThan(0.9)
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
  it('scores at least as well as the MLP, and better than the default 38% seat in the default room', () => {
    const { recommended, current, mlpIsRecommended } =
      recommendSeat(DEFAULT_CONFIG)

    expect(recommended.score).toBeGreaterThan(current.score)
    expect(mlpIsRecommended).toBe(false)
  })

  it('stays off the first length mode’s null', () => {
    const { recommended } = recommendSeat(DEFAULT_CONFIG)

    expect(Math.abs(recommended.position.y - 3)).toBeGreaterThan(0.25)
  })

  it('is still the recommended seat once the MLP is moved there', () => {
    const { recommended } = recommendSeat(DEFAULT_CONFIG)
    const moved = recommendSeat({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: recommended.position },
    })

    expect(moved.mlpIsRecommended).toBe(true)
    expect(moved.recommended.position).toEqual(recommended.position)
  })

  it('keeps the MLP when no seat is better by more than the model’s precision', () => {
    // The 24 x 15 ft 7.2.2 room of the share-link fixtures: the best seat
    // of the grid is only about a point better than the 38% MLP.
    const config = V1_LINKS.imperialRoom.config as Config
    const { recommended, current, candidates, mlpIsRecommended } =
      recommendSeat(config)
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
