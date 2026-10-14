import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  evenerSubwooferCounts,
  SUBWOOFER_ARRANGEMENTS,
  type Config,
  type Room,
  type SubwooferCount,
  type SubwooferId,
  type Wall,
} from '@/domain'

function config(room: Room, subwoofers: SubwooferCount): Config {
  return {
    ...DEFAULT_CONFIG,
    room,
    layout: { dolbyLayout: '7.1.4', subwoofers },
  }
}

/**
 * The arrangements of docs/research/multi-subwoofer-placement.md section 3:
 * Welti's optimum for each subwoofer count (Harman white paper, slides
 * 47-50), every subwoofer at the middle of a wall. Numbered so that adding
 * a subwoofer keeps the others where they are, except from 2 to 3: the
 * 3-subwoofer optimum has no back-wall subwoofer.
 */
const CITED_WALLS = {
  1: { Sub1: 'front' },
  2: { Sub1: 'front', Sub2: 'back' },
  3: { Sub1: 'front', Sub2: 'left', Sub3: 'right' },
  4: { Sub1: 'front', Sub2: 'left', Sub3: 'right', Sub4: 'back' },
} as const satisfies Record<SubwooferCount, Partial<Record<SubwooferId, Wall>>>

/** Our modelling assumptions: 0.3 m from the wall to the subwoofer's acoustic center, 0.3 m above the floor. */
const WALL_CLEARANCE = 0.3
const HEIGHT = 0.3

/** The middle of a wall, brought into the room by the wall clearance. */
function wallMidpoint({ length, width }: Room, wall: Wall) {
  const middle = {
    front: { x: 0, y: WALL_CLEARANCE },
    back: { x: 0, y: length - WALL_CLEARANCE },
    left: { x: -width / 2 + WALL_CLEARANCE, y: length / 2 },
    right: { x: width / 2 - WALL_CLEARANCE, y: length / 2 },
  }[wall]
  return { x: near(middle.x), y: near(middle.y), z: HEIGHT }
}

/** Matches a number within 1e-9 of `value`, for positions built from fractions. */
function near(value: number): number {
  return expect.closeTo(value, 9) as number
}

/** The subwoofers' ids, walls and positions. */
function placedSubwoofers(room: Room, subwoofers: SubwooferCount) {
  return analyzeRoom(config(room, subwoofers)).subwoofers.map(
    ({ id, wall, position }) => ({ id, wall, position }),
  )
}

/** What the cited arrangement for `subwoofers` gives in `room`. */
function citedArrangement(room: Room, subwoofers: SubwooferCount) {
  return Object.entries(CITED_WALLS[subwoofers]).map(([id, wall]) => ({
    id,
    wall,
    position: wallMidpoint(room, wall),
  }))
}

/** Welti's test room: 20 ft wide, 24 ft long, 9 ft high (HW-SUBS slide 23). */
const WELTI_TEST_ROOM: Room = {
  length: 24 * 0.3048,
  width: 20 * 0.3048,
  height: 9 * 0.3048,
}

/**
 * Valid rooms from the smallest to the largest, with the odd shapes in
 * between. Welti checked only some of his arrangements in other room
 * proportions, so here the arrangement is applied as room fractions, not
 * confirmed (research section 4, items 3 and 5).
 */
const OTHER_ROOMS: Room[] = [
  { length: 2, width: 2, height: 2 },
  { length: 6, width: 4.5, height: 2.6 },
  { length: 15, width: 15, height: 5 },
  { length: 15, width: 2, height: 2.4 },
  { length: 2, width: 15, height: 2.4 },
  { length: 3.5, width: 5.5, height: 2.4 },
  { length: 8, width: 3, height: 3 },
  { length: 10, width: 6, height: 3.5 },
]

describe.each([1, 2, 3, 4] as const)(
  '%i auto-placed subwoofer(s)',
  (subwoofers) => {
    it("match the cited arrangement in Welti's 20 x 24 ft test room: the middle of each cited wall, 0.3 m in from it", () => {
      expect(placedSubwoofers(WELTI_TEST_ROOM, subwoofers)).toEqual(
        citedArrangement(WELTI_TEST_ROOM, subwoofers),
      )
    })

    it.each(
      OTHER_ROOMS.map(
        (room) => [room.length, room.width, room.height, room] as const,
      ),
    )(
      'in a %f x %f x %f m room take the cited arrangement as room fractions, 0.3 m in from each wall',
      (_length, _width, _height, room) => {
        expect(placedSubwoofers(room, subwoofers)).toEqual(
          citedArrangement(room, subwoofers),
        )
      },
    )
  },
)

describe('auto-placed subwoofers', () => {
  it('go to the middle of all four walls in the default room for four subwoofers', () => {
    const placed = analyzeRoom(config(DEFAULT_CONFIG.room, 4)).subwoofers

    // 6 m long, 4.5 m wide: the side walls are 2.25 m from the center line.
    expect(placed.map(({ position: { x, y } }) => [x, y])).toEqual([
      [0, 0.3],
      [near(-1.95), 3],
      [near(1.95), 3],
      [0, near(5.7)],
    ])
  })

  it('are named Subwoofer 1 to 4 after their ids', () => {
    const placed = analyzeRoom(config(DEFAULT_CONFIG.room, 4)).subwoofers

    expect(placed.map(({ id, name }) => [id, name])).toEqual([
      ['Sub1', 'Subwoofer 1'],
      ['Sub2', 'Subwoofer 2'],
      ['Sub3', 'Subwoofer 3'],
      ['Sub4', 'Subwoofer 4'],
    ])
  })

  it('keep their places when a subwoofer is added, except from 2 to 3, where Subwoofer 2 moves from the back wall to the left wall', () => {
    const room = DEFAULT_CONFIG.room
    const kept = (from: SubwooferCount, to: SubwooferCount) => {
      const after = placedSubwoofers(room, to)
      return placedSubwoofers(room, from).filter((before) =>
        after.some(
          ({ id, position }) =>
            id === before.id &&
            position.x === before.position.x &&
            position.y === before.position.y,
        ),
      )
    }

    expect(kept(1, 2)).toEqual(placedSubwoofers(room, 1))
    expect(kept(3, 4)).toEqual(placedSubwoofers(room, 3))
    expect(kept(2, 3).map(({ id }) => id)).toEqual(['Sub1'])
  })

  it("each use their own specs if they have them, and the Subwoofers group's otherwise", () => {
    const groupSpecs = {
      enclosure: 'ported',
      driverDiameter: 0.381,
      rmsWatts: 800,
      peakWatts: 1600,
    } as const
    const ownSpecs = {
      enclosure: 'sealed',
      driverDiameter: 0.254,
      rmsWatts: 150,
      peakWatts: 300,
    } as const

    const placed = analyzeRoom({
      ...config(DEFAULT_CONFIG.room, 3),
      speakerGroups: {
        ...DEFAULT_CONFIG.speakerGroups,
        subwoofers: { specs: groupSpecs, ownSpecs: { Sub2: ownSpecs } },
      },
    }).subwoofers

    expect(placed.map(({ id, specs }) => [id, specs])).toEqual([
      ['Sub1', groupSpecs],
      ['Sub2', ownSpecs],
      ['Sub3', groupSpecs],
    ])
  })

  it('suggest 2 or 4 instead of 3, whose cited layout evened out the bass less than 2 (Std 2.7 vs 1.3 dB)', () => {
    expect(evenerSubwooferCounts(3)).toEqual([2, 4])
    for (const count of [1, 2, 4] as const) {
      expect(evenerSubwooferCounts(count)).toEqual([])
    }
    expect(
      [1, 2, 3, 4].map(
        (count) =>
          SUBWOOFER_ARRANGEMENTS[count as SubwooferCount].seatToSeatStdDb,
      ),
    ).toEqual([3.9, 1.3, 2.7, 0.9])
  })

  it('stay where they are when only the listener-level layout changes', () => {
    const positions = (dolbyLayout: Config['layout']['dolbyLayout']) =>
      analyzeRoom({
        ...DEFAULT_CONFIG,
        layout: { dolbyLayout, subwoofers: 2 },
      }).subwoofers.map(({ position }) => position)

    expect(positions('2.1')).toEqual(positions('7.1.4'))
  })
})
