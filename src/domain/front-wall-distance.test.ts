import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { withAutoPlacement } from './auto-place'
import { DEFAULT_CONFIG, type Config } from './config'
import type { ChannelId, DolbyLayout } from './dolby-layouts'
import {
  frontStageDistance,
  frontStageDistances,
  frontStageOutsideTolerance,
} from './front-wall-distance'
import { frontStageLine } from './placement'
import { centerLineProjection, placeAll, placeSpeakers } from './placements'
import type { Room, RoomPoint } from './room'
import type { RoomScreen } from './screen'
import { recommendSeat } from './seat-score'
import { yardsticksFor } from '@/test/relative-speed'
import { HEAVY_TEST_TIMEOUT_MS } from '@/test/timeouts'

const DEFAULT_ROOM = DEFAULT_CONFIG.room
/** The owner's room of #149. */
const OWNER_ROOM: Room = { length: 4.5, width: 3, height: 2.6 }

function config(dolbyLayout: DolbyLayout, room: Room = DEFAULT_ROOM): Config {
  return { ...DEFAULT_CONFIG, room, layout: { dolbyLayout, subwoofers: 1 } }
}

function seat(x: number, y: number): RoomPoint {
  return { x, y, z: 1.2 }
}

/** Where the auto front stage of `placed` stands from the front wall. */
function frontStageY(placed: Config, channel: ChannelId = 'L'): number {
  const speaker = placeAll(placed).speakers.find(
    ({ reference }) => reference.channel === channel,
  )
  if (!speaker) throw new Error(`no ${channel}`)
  return speaker.position.y
}

describe('the front-wall distances tried for a seat (#158)', () => {
  it('run in whole centimeters from the 0.3 m wall clearance to 0.6 m', () => {
    const distances = frontStageDistances(seat(0, 4))

    expect(distances).toHaveLength(31)
    expect(distances[0]).toBe(0.3)
    expect(distances).toContain(0.5)
    expect(distances.at(-1)).toBe(0.6)
  })

  it('stop where the seat would be less than 1.5 m behind the front stage', () => {
    // 2.05 − 1.5 = 0.55 m.
    expect(frontStageDistances(seat(0, 2.05)).at(-1)).toBe(0.55)
  })

  it('are none for a seat too near the front wall to keep the seating distance from 0.5 m: it keeps 0.5 m', () => {
    expect(frontStageDistances(seat(0, 1.99))).toEqual([])
    expect(frontStageDistance(config('2.1'), seat(0, 1.99))).toBe(0.5)
    expect(frontStageDistance(config('2.1'), seat(0, 1.71))).toBe(0.5)
  })
})

describe('the front-wall distance auto-place chooses (#158)', () => {
  it('keeps the usual 0.5 m in the default 5.1.2 room: no distance is meaningfully better at the 38% MLP', () => {
    const at = seat(0, 2.28)
    const chosen = frontStageDistance(DEFAULT_CONFIG, at)

    expect(chosen).toBe(0.5)
    expect(frontStageY(DEFAULT_CONFIG)).toBeCloseTo(0.5, 9)
    for (const distance of frontStageDistances(at)) {
      expect(
        frontStageOutsideTolerance(DEFAULT_CONFIG, at, distance),
      ).toBeGreaterThan(
        frontStageOutsideTolerance(DEFAULT_CONFIG, at, 0.5) - 0.05,
      )
    }
  })

  it('moves the 2.1 front pair to the wall clearance in the default room, where the band is meaningfully nearer the target', () => {
    const at = seat(0, 2.28)
    const twoOne = config('2.1')
    const chosen = frontStageDistance(twoOne, at)

    expect(chosen).toBe(0.3)
    expect(frontStageY(twoOne)).toBeCloseTo(0.3, 9)
    expect(frontStageOutsideTolerance(twoOne, at, 0.3)).toBeLessThanOrEqual(
      frontStageOutsideTolerance(twoOne, at, 0.5) - 0.05,
    )
  })

  it('is the same for Left, Center and Right', () => {
    const placed = withAutoPlacement(
      config('5.1.4', { length: 3.5, width: 3, height: 2.4 }),
    )

    expect(frontStageY(placed, 'L')).toBeCloseTo(0.6, 9)
    expect(frontStageY(placed, 'C')).toBeCloseTo(0.6, 9)
    expect(frontStageY(placed, 'R')).toBeCloseTo(0.6, 9)
  })

  it('is deterministic, whatever was chosen before', () => {
    const twoOne = config('2.1')
    const first = frontStageDistance(twoOne, seat(0, 2.28))
    frontStageDistance(DEFAULT_CONFIG, seat(0, 3))
    frontStageDistance(twoOne, seat(0, 3))

    expect(frontStageDistance(twoOne, seat(0, 2.28))).toBe(first)
  })

  it('is not tuned with a Screen: the screen rule wins', () => {
    const tv: RoomScreen = {
      kind: 'tv',
      width: 1.44,
      height: 0.81,
      bottomEdge: 0.93,
      x: 0,
      standoff: null,
    }
    const transparent: RoomScreen = {
      kind: 'projection',
      width: 2,
      height: 1.125,
      bottomEdge: 0.6,
      x: 0,
      standoff: 0.75,
    }
    for (const screen of [tv, transparent]) {
      const withScreen: Config = {
        ...config('2.1'),
        roomObjects: { ...DEFAULT_CONFIG.roomObjects, screen },
      }
      expect(frontStageDistance(withScreen, seat(0, 2.28))).toBe(
        frontStageLine(screen),
      )
    }
  })
})

describe('the Response score with the chosen front-wall distance (#158, pinned)', () => {
  // Before #158 the front stage always stood 0.5 m from the front wall.
  it.each([
    // [room, layout, MLP, distance, score before, score after]
    ['default', '5.1.2', 'auto', seat(0, 2.28), 0.5, 53, 53],
    ['default', '5.1.2', 'Auto-place', seat(0, 2.28), 0.5, 53, 53],
    ['default', '2.1', 'auto', seat(0, 2.28), 0.3, 35, 54],
    // Auto-place moved the seat from x = −0.836 m (score 67 there before).
    ['default', '2.1', 'Auto-place', seat(-0.557, 2.229), 0.3, 67, 67],
    ['owner', '5.1.2', 'auto', seat(0, 1.71), 0.5, 64, 64],
    ['owner', '5.1.2', 'Auto-place', seat(0, 3.086), 0.5, 77, 77],
    ['owner', '2.1', 'auto', seat(0, 1.71), 0.5, 59, 59],
    ['owner', '2.1', 'Auto-place', seat(-0.72, 3.086), 0.5, 77, 77],
  ] as const)(
    '%s room, %s, %s MLP: %s, front stage %f m from the wall',
    (room, dolbyLayout, mlp, at, distance, _before, after) => {
      const base = config(
        dolbyLayout,
        room === 'owner' ? OWNER_ROOM : DEFAULT_ROOM,
      )
      const placed = mlp === 'auto' ? base : withAutoPlacement(base)
      const { response, mlp: placedMlp } = analyzeRoom(placed)

      expect(placedMlp.x).toBeCloseTo(at.x, 3)
      expect(placedMlp.y).toBeCloseTo(at.y, 3)
      expect(frontStageDistance(placed, placedMlp)).toBe(distance)
      expect(response.score.value).toBe(after)
    },
  )

  it('improves a short room with a low ceiling after Auto-place, 5.1.4: from 57 to 64, every grade ideal', () => {
    const placed = withAutoPlacement(
      config('5.1.4', { length: 3.5, width: 3, height: 2.4 }),
    )
    const analysis = analyzeRoom(placed)

    expect(frontStageDistance(placed, analysis.mlp)).toBe(0.6)
    expect(analysis.response.score.value).toBe(64)
    for (const { placementRange } of [
      ...analysis.speakers,
      ...analysis.overheads,
    ]) {
      expect(placementRange.grade).toBe('ideal')
    }
  })
})

describe('the recommended seat and its front stage (#158, #147)', () => {
  it.each([
    ['default', '5.1.2'],
    ['default', '2.1'],
    ['owner', '5.1.2'],
    ['owner', '2.1'],
  ] as const)(
    '%s room, %s: after Auto-place the MLP scores what the recommendation scores, with every listener-level grade ideal',
    (room, dolbyLayout) => {
      const placed = withAutoPlacement(
        config(dolbyLayout, room === 'owner' ? OWNER_ROOM : DEFAULT_ROOM),
      )
      const { recommended, current, mlpIsRecommended } = recommendSeat(placed)

      expect(mlpIsRecommended).toBe(true)
      expect(current.score).toBeCloseTo(recommended.score, 12)
      expect(recommended.distances.behindFrontStage).toBeGreaterThanOrEqual(
        1.5 - 1e-9,
      )
      for (const { placementRange } of analyzeRoom(placed).speakers) {
        expect(placementRange.grade).toBe('ideal')
      }
    },
  )

  it("installs a candidate seat's stage with the same distance the room view draws for that install point", () => {
    const twoOne = config('2.1')
    const installedFor = centerLineProjection(seat(-0.557, 2.229))
    const candidate = placeSpeakers(twoOne, {
      installedFor,
      heardAt: seat(-0.557, 2.229),
    })
    const drawn = placeSpeakers(twoOne, { installedFor, heardAt: installedFor })

    expect(candidate.map(({ position }) => position)).toEqual(
      drawn.map(({ position }) => position),
    )
    expect(candidate[0]!.position.y).toBeCloseTo(
      frontStageDistance(twoOne, installedFor),
      9,
    )
  })
})

describe('the cost of choosing (#158)', () => {
  it(
    'is small next to the seat score: every distance at the 15 install points of the largest grid, cold, in under 2 yardsticks',
    () => {
      // Unmemoized: the work the seat score's grid adds once per new input.
      // About 0.8 yardsticks, next to about 9 for that room's whole seat
      // score (seat-score.test.ts); the bound is a little over twice that.
      // Heavy: the work runs three times (HEAVY_TEST_TIMEOUT_MS).
      const big = config('7.1.4', { length: 15, width: 15, height: 5 })
      const work = () => {
        for (let i = 0; i < 15; i++) {
          const at = seat(0, 2 + i * 0.8)
          for (const distance of frontStageDistances(at)) {
            frontStageOutsideTolerance(big, at, distance)
          }
        }
      }

      const cost = yardsticksFor(work)
      expect(cost, 'yardsticks').toBeLessThan(2)
    },
    HEAVY_TEST_TIMEOUT_MS,
  )
})
