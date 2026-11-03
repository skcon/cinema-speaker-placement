import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { withAutoPlacement } from './auto-place'
import { DEFAULT_CONFIG, type Config } from './config'
import type {
  DolbyLayout,
  OverheadChannelId,
  OverheadChannelReference,
} from './dolby-layouts'
import { checkOverheadPlacementRange } from './placement-range'
import { placeAll } from './placements'
import { SPEAKER_WALL_CLEARANCE } from './reference'
import {
  azimuthFromMlp,
  sideViewElevation,
  type Room,
  type RoomPoint,
} from './room'
import { HEAVY_TEST_TIMEOUT_MS } from '@/test/timeouts'

function config(dolbyLayout: DolbyLayout, room: Room = DEFAULT_CONFIG.room) {
  return {
    ...DEFAULT_CONFIG,
    room,
    layout: { dolbyLayout, subwoofers: 1 },
  } satisfies Config
}

function overhead(
  analysis: ReturnType<typeof analyzeRoom>,
  channel: OverheadChannelId,
) {
  const found = analysis.overheads.find((o) => o.channel === channel)
  if (!found) throw new Error(`no ${channel} overhead`)
  return found
}

describe('auto-placed overhead speakers', () => {
  it('are only in layouts with overheads, in Dolby order and with Dolby names', () => {
    expect(analyzeRoom(config('7.1')).overheads).toEqual([])
    expect(
      analyzeRoom(config('7.1.4')).overheads.map(({ channel, name }) => [
        channel,
        name,
      ]),
    ).toEqual([
      ['Ltf', 'Left Top Front'],
      ['Rtf', 'Right Top Front'],
      ['Ltr', 'Left Top Rear'],
      ['Rtr', 'Right Top Rear'],
    ])
  })

  it('sit on the ceiling, at the nominal elevation in front of and behind the MLP', () => {
    // Default room 6 x 4.5 x 2.6 m, MLP 2.28 m from the front wall at
    // 1.2 m: the ceiling is 1.4 m above the ears, so 45° is 1.4 m ahead
    // and 135° is 1.4 m behind.
    const analysis = analyzeRoom(config('5.1.4'))
    const front = overhead(analysis, 'Ltf')
    const rear = overhead(analysis, 'Rtr')

    expect(front.position.z).toBe(2.6)
    expect(front.position.y).toBeCloseTo(0.88, 9)
    expect(rear.position.y).toBeCloseTo(3.68, 9)
    expect(front.placementRange.elevation.degrees).toBeCloseTo(45, 9)
    expect(rear.placementRange.elevation.degrees).toBeCloseTo(135, 9)
    expect(front.placement).toBe('auto')
  })

  it('space each pair 0.6 × the layout width, the outermost listener-level speakers apart', () => {
    // 5.1 bed: Ls/Rs at ±115° on the side walls' clearance lines, ±1.95 m,
    // are the outermost: 3.9 m wide, so the pair is ±0.6 × 1.95 = ±1.17 m.
    const analysis = analyzeRoom(config('5.1.4'))

    expect(overhead(analysis, 'Ltf').position.x).toBeCloseTo(-1.17, 3)
    expect(overhead(analysis, 'Rtf').position.x).toBeCloseTo(1.17, 3)
    expect(overhead(analysis, 'Ltr').position.x).toBeCloseTo(-1.17, 3)
    // atan(1.17 / 1.4) = 39.9°: inside 30°–60°
    expect(overhead(analysis, 'Rtf').placementRange.azimuth).toMatchObject({
      shown: 40,
      grade: 'ideal',
    })
    expect(overhead(analysis, 'Rtr').placementRange.azimuth).toMatchObject({
      shown: 140,
      grade: 'ideal',
    })
  })

  it('put top middle at the middle of 65°–100°, 83° to the whole degree, as Dolby gives no nominal', () => {
    // 1.4 m / tan 83° = 0.172 m ahead of the MLP
    const analysis = analyzeRoom(config('5.1.2'))
    const ltm = overhead(analysis, 'Ltm')

    expect(ltm.position.y).toBeCloseTo(2.108, 3)
    expect(ltm.placementRange).toMatchObject({
      grade: 'ideal',
      elevation: { shown: 83, grade: 'ideal' },
      azimuth: { grade: null },
    })
  })

  it('stay inside the wall clearance, grading the elevation that leaves honestly', () => {
    // 2 x 2 x 2 m: the MLP is 0.76 m from the front wall and the ceiling
    // 0.8 m above the ears, so 45° would be 0.04 m behind the front wall.
    // Clamped to 0.3 m from it: atan(0.8 / 0.46) = 60.1°, outside 30°–55°.
    const analysis = analyzeRoom(
      config('5.1.4', { length: 2, width: 2, height: 2 }),
    )
    const front = overhead(analysis, 'Rtf')

    expect(front.position.y).toBeCloseTo(0.3, 9)
    expect(front.placementRange.elevation).toMatchObject({
      shown: 60,
      grade: 'outside',
    })
    expect(front.placementRange.grade).toBe('outside')
  })

  it.each(['5.1.4', '7.1.4'] as const)(
    'in %s are all ideal after Auto-place in the 4.5 x 3 x 2.6 m room of #150',
    (dolbyLayout) => {
      // The layout width there put the pairs ±0.72 m apart: the top front
      // at 27° (ideal 30°–60°), outside.
      const placed = withAutoPlacement(
        config(dolbyLayout, { length: 4.5, width: 3, height: 2.6 }),
      )
      for (const { channel, placementRange } of analyzeRoom(placed).overheads) {
        expect([channel, placementRange.grade]).toEqual([channel, 'ideal'])
      }
    },
  )

  it('move sideways to 1° inside their azimuth range, keeping the 45° elevation, in the 4.5 x 3 x 2.6 m room', () => {
    // The MLP 3.09 m from the front wall, the ceiling 1.4 m above the
    // ears: 45° is 1.4 m ahead. The spacing put the top front 0.72 m off
    // the MLP's line, 27°; the nearest ideal point keeps y and goes out to
    // 31°: 1.4 × tan 31° = 0.841 m.
    const analysis = analyzeRoom(
      withAutoPlacement(
        config('7.1.4', { length: 4.5, width: 3, height: 2.6 }),
      ),
    )
    const front = overhead(analysis, 'Ltf')
    const rear = overhead(analysis, 'Rtr')

    expect(analysis.mlp.y).toBeCloseTo(3.086, 3)
    expect(front.position.x).toBeCloseTo(
      -1.4 * Math.tan((31 * Math.PI) / 180),
      9,
    )
    expect(front.position.y).toBeCloseTo(analysis.mlp.y - 1.4, 9)
    expect(front.placementRange).toMatchObject({
      azimuth: { shown: 31, grade: 'ideal' },
      elevation: { shown: 45, grade: 'ideal' },
    })
    // The top rear was ideal (147°, 129° at the back wall's clearance)
    // and stays where the spacing put it.
    expect(rear.position).toEqual({ x: 0.72, y: 4.2, z: 2.6 })
    expect(rear.placementRange.azimuth).toMatchObject({ shown: 147 })
  })

  it('bring the top rear out to 149° where the spacing left it at 153°, in a 5 x 3 x 2.6 m room', () => {
    const analysis = analyzeRoom(
      withAutoPlacement(config('5.1.4', { length: 5, width: 3, height: 2.6 })),
    )
    const rear = overhead(analysis, 'Rtr')

    expect(rear.placementRange).toMatchObject({
      grade: 'ideal',
      azimuth: { shown: 149, grade: 'ideal' },
    })
  })

  it.each(['5.1.2', '5.1.4', '7.1.2', '7.1.4'] as const)(
    'in %s are all ideal in the default room',
    (dolbyLayout) => {
      for (const { placementRange } of analyzeRoom(config(dolbyLayout))
        .overheads) {
        expect(placementRange.grade).toBe('ideal')
      }
    },
  )

  it('follow the ceiling when the room gets taller', () => {
    const analysis = analyzeRoom(
      config('7.1.2', { length: 6, width: 4.5, height: 3.4 }),
    )

    for (const { position } of analysis.overheads) {
      expect(position.z).toBe(3.4)
    }
  })

  it('stay out of the estimated response: the chart is the same with or without them', () => {
    const withOverheads = analyzeRoom(config('7.1.4')).response.estimated
    const without = analyzeRoom(config('7.1')).response.estimated

    expect(withOverheads).toEqual(without)
  })
})

const OVERHEAD_LAYOUTS = ['5.1.2', '5.1.4', '7.1.2', '7.1.4'] as const

/** from, from + step, ... up to `to`, rounded to the centimeter. */
function steps(from: number, to: number, step: number): number[] {
  const count = Math.round((to - from) / step)
  return Array.from(
    { length: count + 1 },
    (_, i) => Math.round((from + i * step) * 100) / 100,
  )
}

function rooms(lengths: number[], widths: number[], heights: number[]) {
  return lengths.flatMap((length) =>
    widths.flatMap((width) =>
      heights.map((height) => ({ length, width, height })),
    ),
  )
}

function grade(
  reference: OverheadChannelReference,
  mlp: RoomPoint,
  position: RoomPoint,
) {
  return checkOverheadPlacementRange(
    reference,
    azimuthFromMlp(mlp, position),
    sideViewElevation(mlp, position),
  ).grade
}

/**
 * Whether any point of the ceiling inside the wall clearance grades ideal
 * from `mlp`: a brute-force search on a 2 cm grid, independent of the
 * placement rule.
 */
function idealFits(
  room: Room,
  mlp: RoomPoint,
  reference: OverheadChannelReference,
): boolean {
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const xLimit = room.width / 2 - clearance
  for (let x = -xLimit; x <= xLimit + 1e-9; x += 0.02) {
    for (let y = clearance; y <= room.length - clearance + 1e-9; y += 0.02) {
      if (grade(reference, mlp, { x, y, z: room.height }) === 'ideal') {
        return true
      }
    }
  }
  return false
}

const formatRoom = ({ length, width, height }: Room) =>
  `${length} x ${width} x ${height}`

/**
 * Every overhead of `placed` that doesn't grade ideal: its room, layout
 * and channel, and whether an ideal point would have fitted.
 */
function notIdeal(placed: Config) {
  const { mlp, overheads } = placeAll(placed)
  return overheads
    .filter(
      ({ reference, position }) =>
        grade(reference, mlp.position, position) !== 'ideal',
    )
    .map(({ reference }) => ({
      room: formatRoom(placed.room),
      layout: placed.layout.dolbyLayout,
      channel: reference.channel,
      idealFits: idealFits(placed.room, mlp.position, reference),
    }))
}

/** The distinct "room layout" labels of `found`, in order. */
function roomsAndLayouts(found: ReturnType<typeof notIdeal>): string[] {
  return [...new Set(found.map(({ room, layout }) => `${room} ${layout}`))]
}

describe('auto-placed overhead speakers across rooms (#150)', () => {
  it(
    'are ideal around the auto MLP in every room 3.5–9 x 3–7 x 2.4–3 m and every overhead layout where an ideal point fits; the rooms where none fits are named',
    () => {
      // Every 0.5 m of length and width and 0.2 m of ceiling: 468 rooms.
      // Heavy on purpose: 1,872 placements (HEAVY_TEST_TIMEOUT_MS).
      const found = rooms(
        steps(3.5, 9, 0.5),
        steps(3, 7, 0.5),
        steps(2.4, 3, 0.2),
      ).flatMap((room) =>
        OVERHEAD_LAYOUTS.flatMap((layout) => notIdeal(config(layout, room))),
      )

      expect(found.filter(({ idealFits }) => idealFits)).toEqual([])
      // Only the top front, and only where the auto MLP (38% of the
      // length) is too near the front wall for the ceiling: 55°, the top
      // of 30°–55°, needs the speaker (ceiling − 1.2 m) / tan 55° ahead,
      // more than the 0.3 m wall clearance leaves (1.03 m at 3.5 m long,
      // 1.22 m at 4 m). Outside is the best grade there: Dolby gives
      // overheads no acceptable range.
      expect(new Set(found.map(({ channel }) => channel))).toEqual(
        new Set(['Ltf', 'Rtf']),
      )
      expect(roomsAndLayouts(found)).toEqual(
        [
          ...rooms([3.5], steps(3, 7, 0.5), [2.8, 3]),
          ...rooms([4], steps(3, 7, 0.5), [3]),
        ].flatMap((room) =>
          ['5.1.4', '7.1.4'].map((layout) => `${formatRoom(room)} ${layout}`),
        ),
      )
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  it.each([
    [2.4, []],
    [2.6, ['4.5 x 4 x 2.6 5.1.4', '5 x 7 x 2.6 5.1.4']],
    [
      3,
      [
        '3.5 x 3 x 3 5.1.4',
        '3.5 x 3 x 3 7.1.4',
        '3.5 x 4 x 3 5.1.4',
        '3.5 x 4 x 3 7.1.4',
        '3.5 x 5 x 3 5.1.4',
        '3.5 x 5 x 3 7.1.4',
        '3.5 x 7 x 3 5.1.4',
        '3.5 x 7 x 3 7.1.4',
        '4 x 3 x 3 5.1.4',
        '4 x 3 x 3 7.1.4',
        '4.5 x 3 x 3 5.1.4',
        '4.5 x 5 x 3 5.1.4',
        '4.5 x 5 x 3 7.1.4',
        '5 x 7 x 3 5.1.4',
        '5.5 x 7 x 3 5.1.4',
      ],
    ],
  ] as const)(
    'after Auto-place, under a %f m ceiling, are ideal wherever an ideal point fits; the rooms where none fits are named',
    (height, named) => {
      // Auto-place's recommended seat reads the listener-level speakers
      // and the subwoofers, not the overheads (seat-score.ts), so x.1.2
      // and x.1.4 share it: one Auto-place per bed keeps this sweep to
      // 2 x 32 recommendations per ceiling. Heavy on purpose
      // (HEAVY_TEST_TIMEOUT_MS).
      const found = rooms(
        [3.5, 4, 4.5, 5, 5.5, 6, 7, 9],
        [3, 4, 5, 7],
        [height],
      ).flatMap((room) =>
        (['5.1', '7.1'] as const).flatMap((bed) => {
          const placed = withAutoPlacement(config(`${bed}.4`, room))
          return (['.2', '.4'] as const).flatMap((tops) =>
            notIdeal({
              ...placed,
              layout: { ...placed.layout, dolbyLayout: `${bed}${tops}` },
            }),
          )
        }),
      )

      expect(found.filter(({ idealFits }) => idealFits)).toEqual([])
      // Only the top rear, where the recommended seat is near the back
      // wall (it may come within 0.5 m of it, the seating distance, ADR
      // 0005): 125°, the bottom of 125°–150°, needs the speaker
      // (ceiling − 1.2 m) / tan 55° behind the seat, more than the 0.3 m
      // wall clearance leaves. Outside is the best grade there.
      for (const { channel } of found) expect(['Ltr', 'Rtr']).toContain(channel)
      expect(roomsAndLayouts(found)).toEqual(named)
    },
    HEAVY_TEST_TIMEOUT_MS,
  )
})
