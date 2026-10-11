import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type Room,
  type Wall,
} from '@/domain'

type SubwooferCount = Config['layout']['subwoofers']

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
 * 47-50), every subwoofer at the middle of a wall, numbered front, back,
 * left, right.
 */
const CITED_WALLS = {
  1: ['front'],
  2: ['front', 'back'],
  3: ['front', 'left', 'right'],
  4: ['front', 'back', 'left', 'right'],
} as const satisfies Record<SubwooferCount, readonly Wall[]>

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
  return {
    wall,
    position: { x: near(middle.x), y: near(middle.y), z: HEIGHT },
  }
}

/** Matches a number within 1e-9 of `value`, for positions built from fractions. */
function near(value: number): number {
  return expect.closeTo(value, 9) as number
}

/** Valid rooms from the smallest to the largest, with the odd shapes in between. */
const ROOMS: Room[] = [
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
    it.each(
      ROOMS.map(
        (room) => [room.length, room.width, room.height, room] as const,
      ),
    )(
      'in a %f x %f x %f m room match the cited arrangement: the middle of each cited wall, 0.3 m in from it',
      (_length, _width, _height, room) => {
        const placed = analyzeRoom(config(room, subwoofers)).subwoofers

        expect(
          placed.map(({ wall, position }) => ({ wall, position })),
        ).toEqual(
          CITED_WALLS[subwoofers].map((wall) => wallMidpoint(room, wall)),
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
      [0, near(5.7)],
      [near(-1.95), 3],
      [near(1.95), 3],
    ])
  })

  it('are numbered in the arrangement order, as Subwoofer 1 to 4', () => {
    const placed = analyzeRoom(config(DEFAULT_CONFIG.room, 3)).subwoofers

    expect(placed.map(({ id, name }) => [id, name])).toEqual([
      ['Sub1', 'Subwoofer 1'],
      ['Sub2', 'Subwoofer 2'],
      ['Sub3', 'Subwoofer 3'],
    ])
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
