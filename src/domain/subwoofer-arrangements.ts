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
import type { Wall } from './room'

/**
 * The subwoofers a layout can have, by id. A layout with Y subwoofers has
 * the first Y. Ids stay with a subwoofer when the count changes, so its own
 * specs (and, later, a manual position) stay with it too.
 */
export const SUBWOOFER_IDS = ['Sub1', 'Sub2', 'Sub3', 'Sub4'] as const

/** A subwoofer's id, as the room view labels it: "Sub1" to "Sub4". */
export type SubwooferId = (typeof SUBWOOFER_IDS)[number]

/** The subwoofers' display names. */
export const SUBWOOFERS = {
  Sub1: { name: 'Subwoofer 1' },
  Sub2: { name: 'Subwoofer 2' },
  Sub3: { name: 'Subwoofer 3' },
  Sub4: { name: 'Subwoofer 4' },
} as const satisfies Record<SubwooferId, { name: string }>

/** The ids of a layout's subwoofers: Sub1 up to the subwoofer count. */
export function subwooferIds(count: SubwooferCount): readonly SubwooferId[] {
  return SUBWOOFER_IDS.slice(0, count)
}

/**
 * A point on the floor plan as fractions of the Room's inside dimensions:
 * `width` across the room from the left wall (0 is the left wall, 0.5 the
 * center line, 1 the right wall, seen from the MLP facing the front wall)
 * and `length` from the front wall (0) to the back wall (1). The research
 * file writes these as (x/W, y/L).
 */
export type RoomFraction = { readonly width: number; readonly length: number }

/** Where one subwoofer of an arrangement goes. */
export type ArrangedSubwoofer = {
  readonly id: SubwooferId
  /** The wall it stands against. */
  readonly wall: Wall
  readonly at: RoomFraction
}

/** One cited arrangement: a place per subwoofer, Subwoofer 1 first. */
export type SubwooferArrangement = {
  readonly subwoofers: readonly ArrangedSubwoofer[]
  readonly citations: readonly Citation[]
  /** What the source does not confirm about it (research section 4). */
  readonly caveat?: string
}

/** A subwoofer at the middle of a wall. */
function atWallMidpoint(id: SubwooferId, wall: Wall): ArrangedSubwoofer {
  const at = {
    front: { width: 0.5, length: 0 },
    back: { width: 0.5, length: 1 },
    left: { width: 0, length: 0.5 },
    right: { width: 1, length: 0.5 },
  }[wall]
  return { id, wall, at }
}

/**
 * Welti's brute-force optimum for 1 to 4 subwoofers (Harman white paper
 * "Subwoofers: Optimum Number and Locations", Investigation 3): the
 * configuration with the lowest seat-to-seat variation (Std) over a
 * seating area in a 20 x 24 x 9 ft room, with subwoofers on the walls at
 * 2 ft steps. Each optimum puts every subwoofer at the middle of a wall.
 *
 * The slides draw the positions without numbers, so they are read off the
 * figures (research section 4, item 1), and the figures' top wall is read
 * as the front wall (item 2).
 *
 * Numbering keeps a subwoofer in place when one is added: Sub1 is always at
 * the front wall, Sub2 and Sub3 at the side walls once there are three,
 * and Sub4 at the back wall. Only going from 2 to 3 moves one: Sub2 leaves
 * the back wall for the left wall, because the 3-subwoofer optimum has no
 * back-wall subwoofer.
 */
export const SUBWOOFER_ARRANGEMENTS = {
  1: {
    subwoofers: [atWallMidpoint('Sub1', 'front')],
    citations: [
      {
        source: 'HW-SUBS',
        page: 16,
        figure: 'slide 47',
        note: 'the optimum for 1 subwoofer: the middle of the front wall',
      },
    ],
  },
  2: {
    subwoofers: [
      atWallMidpoint('Sub1', 'front'),
      atWallMidpoint('Sub2', 'back'),
    ],
    citations: [
      {
        source: 'HW-SUBS',
        page: 17,
        figure: 'slide 48',
        note: 'the optimum for 2 subwoofers: the middle of the front and back walls',
      },
      {
        source: 'HW-SUBS',
        page: 28,
        figure: 'slide 75',
        note: 'two at opposing wall midpoints nearly match four, with more output',
      },
    ],
    caveat:
      "Welti's test room is longer than wide, and his 2-subwoofer optimum " +
      'uses its shorter front and back walls. Whether the side walls would ' +
      'do better in a room wider than long is not addressed (research ' +
      'section 4, item 5).',
  },
  3: {
    subwoofers: [
      atWallMidpoint('Sub1', 'front'),
      atWallMidpoint('Sub2', 'left'),
      atWallMidpoint('Sub3', 'right'),
    ],
    citations: [
      {
        source: 'HW-SUBS',
        page: 17,
        figure: 'slide 49',
        note: 'the optimum for 3 subwoofers: the middle of the front wall and of both side walls',
      },
    ],
    caveat:
      'Modelled in only one room: unlike the 1-, 2- and 4-subwoofer ' +
      'layouts it was not re-checked in other room proportions, and it ' +
      'scores worse than the 2-subwoofer optimum (Std 2.7 vs 1.3 dB, ' +
      'slides 48, 49 and 51; research section 4, items 3 and 4).',
  },
  4: {
    subwoofers: [
      atWallMidpoint('Sub1', 'front'),
      atWallMidpoint('Sub2', 'left'),
      atWallMidpoint('Sub3', 'right'),
      atWallMidpoint('Sub4', 'back'),
    ],
    citations: [
      {
        source: 'HW-SUBS',
        page: 17,
        figure: 'slide 50',
        note: 'the optimum for 4 subwoofers: the middle of each wall',
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
