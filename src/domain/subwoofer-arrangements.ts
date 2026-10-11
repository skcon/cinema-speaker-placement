/**
 * Where the subwoofers go for each subwoofer count, as typed data with
 * citations. Dolby gives no subwoofer position
 * (docs/research/dolby-speaker-placement.md section 6), so the arrangements
 * come from Todd Welti's multi-subwoofer study at Harman, as recorded in
 * docs/research/multi-subwoofer-placement.md (section 3 lists what is
 * encoded here, section 4 the caveats).
 */
import type { SubwooferCount } from './layout'
import type { Citation } from './reference'

/** A subwoofer's number within the layout: Subwoofer 1 to Subwoofer 4. */
export type SubwooferNumber = SubwooferCount

/** A subwoofer's short id, as the room view labels it. */
export type SubwooferId = `Sub${SubwooferNumber}`

/**
 * A point on the floor plan as fractions of the Room's inside dimensions:
 * `width` across the room from the left wall (0 is the left wall, 0.5 the
 * center line, 1 the right wall, seen from the MLP facing the front wall)
 * and `length` from the front wall (0) to the back wall (1). The research
 * file writes these as (x/W, y/L).
 */
export type RoomFraction = { readonly width: number; readonly length: number }

/** One cited arrangement: a position per subwoofer, Subwoofer 1 first. */
export type SubwooferArrangement = {
  readonly positions: readonly RoomFraction[]
  readonly citations: readonly Citation[]
}

/** The middle of each wall, as room fractions. */
const WALL_MIDPOINT = {
  front: { width: 0.5, length: 0 },
  back: { width: 0.5, length: 1 },
  left: { width: 0, length: 0.5 },
  right: { width: 1, length: 0.5 },
} as const satisfies Record<string, RoomFraction>

/**
 * Welti's brute-force optimum for 1 to 4 subwoofers (Harman white paper
 * "Subwoofers: Optimum Number and Locations", Investigation 3): the
 * configuration with the lowest seat-to-seat variation (Std) over a
 * seating area in a 20 x 24 x 9 ft room, with subwoofers on the walls at
 * 2 ft steps. Each optimum puts every subwoofer at the middle of a wall.
 *
 * The slides draw the positions without numbers, so they are read off the
 * figures (research section 4, item 1), and the figures' top wall is read
 * as the front wall (item 2). Subwoofers are numbered front, back, left,
 * right. The 3-subwoofer optimum was only modelled in Welti's one test
 * room and scores worse than the 2-subwoofer one (items 3 and 4).
 */
export const SUBWOOFER_ARRANGEMENTS = {
  1: {
    positions: [WALL_MIDPOINT.front],
    citations: [
      {
        source: 'HW-SUBS',
        page: 16,
        figure: 'slide 47',
        note: '"1 subwoofer optimized": the middle of the front wall',
      },
    ],
  },
  2: {
    positions: [WALL_MIDPOINT.front, WALL_MIDPOINT.back],
    citations: [
      {
        source: 'HW-SUBS',
        page: 17,
        figure: 'slide 48',
        note: '"2 subwoofers optimized": the middle of the front and back walls',
      },
      {
        source: 'HW-SUBS',
        page: 28,
        figure: 'slide 75',
        note: 'two at opposing wall midpoints nearly match four, with more output',
      },
    ],
  },
  3: {
    positions: [WALL_MIDPOINT.front, WALL_MIDPOINT.left, WALL_MIDPOINT.right],
    citations: [
      {
        source: 'HW-SUBS',
        page: 17,
        figure: 'slide 49',
        note:
          '"3 subwoofers optimized": the middle of the front wall and of ' +
          'both side walls',
      },
    ],
  },
  4: {
    positions: [
      WALL_MIDPOINT.front,
      WALL_MIDPOINT.back,
      WALL_MIDPOINT.left,
      WALL_MIDPOINT.right,
    ],
    citations: [
      {
        source: 'HW-SUBS',
        page: 17,
        figure: 'slide 50',
        note: '"4 subwoofers optimized": the middle of each wall',
      },
      {
        source: 'HW-SUBS',
        page: 21,
        figure: 'slide 59',
        note: 'configuration #11, the best of the 20 practical configurations',
      },
      {
        source: 'HW-SUBS',
        page: 28,
        figure: 'slide 75',
        note: 'one at each wall midpoint is best on every variation metric',
      },
    ],
  },
} as const satisfies Record<SubwooferCount, SubwooferArrangement>

/** The short id of subwoofer `number`, for example "Sub2". */
export function subwooferId(number: SubwooferNumber): SubwooferId {
  return `Sub${number}`
}

/** The name of subwoofer `number`, for example "Subwoofer 2". */
export function subwooferName(number: SubwooferNumber): string {
  return `Subwoofer ${number}`
}
