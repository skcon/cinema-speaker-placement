import { describe, expect, it } from 'vitest'
import { withAutoPlacement } from './auto-place'
import { DEFAULT_CONFIG, type Config } from './config'
import type { ChannelId, DolbyLayout } from './dolby-layouts'
import { idealGapMessage } from './ideal-gap'
import { placeItems } from './placed-items'
import { placeAll, placeSpeakers } from './placements'
import { distanceBetween, type Room, type RoomPoint } from './room'
import { HEAVY_TEST_TIMEOUT_MS } from '@/test/timeouts'

// Auto-place puts every speaker where all its grades are ideal, where the
// room allows, and says which speaker and why where it doesn't (#151;
// placement.ts rule 7, overhead-placement.ts rule 5).

function config(
  dolbyLayout: DolbyLayout,
  room: Room = DEFAULT_CONFIG.room,
  manualPositions: Config['manualPositions'] = {},
): Config {
  return {
    ...DEFAULT_CONFIG,
    room,
    layout: { dolbyLayout, subwoofers: 1 },
    manualPositions,
  }
}

/** The default room (6 x 4.5 x 2.6 m) with the MLP left at `mlp`. */
function withMlp(dolbyLayout: DolbyLayout, mlp: RoomPoint): Config {
  return config(dolbyLayout, DEFAULT_CONFIG.room, { MLP: mlp })
}

function speaker(placed: ReturnType<typeof placeItems>, channel: ChannelId) {
  const found = placed.speakers.find((s) => s.channel === channel)
  if (!found) throw new Error(`no ${channel} speaker`)
  return found
}

/** Whether `point` keeps the 0.3 m wall clearance of the default room. */
function insideClearance({ x, y }: RoomPoint): boolean {
  const { length, width } = DEFAULT_CONFIG.room
  return (
    Math.abs(x) <= width / 2 - 0.3 + 1e-9 &&
    y >= 0.3 - 1e-9 &&
    y <= length - 0.3 + 1e-9
  )
}

describe('auto-placed listener-level speakers where the aim runs into a wall (#151)', () => {
  // The MLP may sit on its 0.3 m wall clearance line; a speaker aimed
  // into that wall has nowhere to go along its aim.
  const AT_BACK: RoomPoint = { x: 0, y: 5.7, z: 1.2 }
  const AT_LEFT: RoomPoint = { x: -1.95, y: 3, z: 1.2 }
  const AT_FRONT: RoomPoint = { x: 0, y: 0.3, z: 1.2 }

  it('turn to the nearest ideal azimuth the wall leaves: 7.1 surrounds at 90° with the MLP on the back clearance line', () => {
    // Ls aims at 100°, the middle of 90°–110°, a little behind the MLP:
    // straight into the back wall's clearance. 90° runs along it.
    const placed = placeItems(withMlp('7.1', AT_BACK))

    for (const channel of ['Ls', 'Rs'] as const) {
      const { position, placementRange } = speaker(placed, channel)
      expect(placementRange.grade).toBe('ideal')
      expect(placementRange.azimuth.shown).toBe(90)
      expect(position.y).toBeCloseTo(5.7, 9)
      expect(Math.abs(position.x)).toBeCloseTo(1.95, 9)
    }
    for (const channel of ['L', 'C', 'R'] as const) {
      expect(speaker(placed, channel).placementRange.grade).toBe('ideal')
    }
  })

  it('name the speakers with no ideal position, and the wall in the way: the rear surrounds with the MLP on the back clearance line', () => {
    // 135°–150° all point behind the MLP: nowhere to go.
    const placed = placeItems(withMlp('7.1', AT_BACK))

    expect(placed.idealGaps).toEqual(
      ['Lrs', 'Rrs'].map((channel) => ({
        channel,
        angles: [{ angle: 'azimuth', ideal: { min: 135, max: 150 } }],
        together: false,
        walls: ['back'],
      })),
    )
    for (const channel of ['Lrs', 'Rrs'] as const) {
      const { position, placementRange } = speaker(placed, channel)
      // Still a real position inside the room, graded as it is.
      expect(placementRange.grade).toBe('outside')
      expect(distanceBetween(position, AT_BACK)).toBeGreaterThan(0.001)
      expect(insideClearance(position)).toBe(true)
    }
    expect(idealGapMessage(placed.idealGaps[0]!, 'mlp')).toBe(
      'Left Rear Surround (Lrs) has no position where every grade is ideal: the back wall is too close to the MLP for its ideal azimuth (135°–150°).',
    )
  })

  it('name the side wall when the MLP is on its clearance line', () => {
    const placed = placeItems(withMlp('5.1', AT_LEFT))

    expect(placed.idealGaps).toEqual([
      {
        channel: 'Ls',
        angles: [{ angle: 'azimuth', ideal: { min: 110, max: 120 } }],
        together: false,
        walls: ['left'],
      },
    ])
    expect(speaker(placed, 'Rs').placementRange.grade).toBe('ideal')
    expect(insideClearance(speaker(placed, 'Ls').position)).toBe(true)
  })

  it('name the front stage when the MLP is on the front clearance line, and keep it inside the room', () => {
    const placed = placeItems(withMlp('3.1', AT_FRONT))

    expect(
      placed.idealGaps.map(({ channel, walls }) => [channel, walls]),
    ).toEqual([
      ['L', ['front']],
      ['C', ['front']],
      ['R', ['front']],
    ])
    for (const { position } of placed.speakers) {
      expect(insideClearance(position)).toBe(true)
      expect(distanceBetween(position, AT_FRONT)).toBeGreaterThan(0.001)
    }
  })

  it('stand at the wall clearance, not on the MLP, when the MLP is less than a millimeter behind the front-stage line', () => {
    const placed = placeItems(withMlp('3.1', { x: 0, y: 0.5005, z: 1.2 }))

    expect(placed.idealGaps).toEqual([])
    expect(speaker(placed, 'C').position.y).toBeCloseTo(0.3, 9)
    for (const { placementRange } of placed.speakers) {
      expect(placementRange.grade).toBe('ideal')
    }
  })

  it('leave every speaker as before, with no gap, where the aim fits: the default room', () => {
    const placed = placeItems(DEFAULT_CONFIG)

    expect(placed.idealGaps).toEqual([])
    for (const { placementRange } of placed.speakers) {
      expect(placementRange.grade).toBe('ideal')
    }
  })

  it('are placed by the same rule for the seat score: installed for a seat, they are where placeAll puts them for an MLP there', () => {
    const installed = placeSpeakers(config('7.1'), {
      installedFor: AT_BACK,
      heardAt: { x: 0.5, y: 4, z: 1.2 },
    })
    const placed = placeAll(withMlp('7.1', AT_BACK)).speakers

    expect(installed.map(({ position }) => position)).toEqual(
      placed.map(({ position }) => position),
    )
    expect(installed.map(({ idealGap }) => idealGap)).toEqual(
      placed.map(({ idealGap }) => idealGap),
    )
  })

  it('report no gap for a manual speaker', () => {
    const placed = placeItems({
      ...withMlp('7.1', AT_BACK),
      manualPositions: { MLP: AT_BACK, Lrs: { x: -1, y: 4, z: 1.2 } },
    })

    expect(placed.idealGaps.map(({ channel }) => channel)).toEqual(['Rrs'])
  })
})

describe('auto-placed overheads with no ideal point (#151)', () => {
  it('name the angle and the wall in the way: the top front in a 3.5 x 3 x 3 m room around the auto MLP', () => {
    // #150: 55°, the top of 30°–55°, needs the speaker 1.8 m / tan 55° =
    // 1.26 m ahead of the MLP, 1.33 m from the front wall: past the 0.3 m
    // clearance. Its azimuth alone would fit.
    const placed = placeItems(
      config('5.1.4', { length: 3.5, width: 3, height: 3 }),
    )

    expect(placed.idealGaps).toEqual(
      ['Ltf', 'Rtf'].map((channel) => ({
        channel,
        angles: [{ angle: 'elevation', ideal: { min: 30, max: 55 } }],
        together: false,
        walls: ['front'],
      })),
    )
    expect(idealGapMessage(placed.idealGaps[0]!, 'mlp')).toBe(
      'Left Top Front (Ltf) has no position where every grade is ideal: the front wall is too close to the MLP for its ideal elevation (30°–55°).',
    )
  })
})

const LAYOUTS = [
  '2.1',
  '3.1',
  '5.1',
  '7.1',
  '5.1.2',
  '5.1.4',
  '7.1.2',
  '7.1.4',
] as const satisfies readonly DolbyLayout[]

/** Lengths from `from` to `to` in `step`s, to the centimeter. */
function steps(from: number, to: number, step: number): number[] {
  const count = Math.round((to - from) / step)
  return Array.from(
    { length: count + 1 },
    (_, index) => Math.round((from + index * step) * 100) / 100,
  )
}

function rooms(
  lengths: readonly number[],
  widths: readonly number[],
  heights: readonly number[],
): Room[] {
  return lengths.flatMap((length) =>
    widths.flatMap((width) =>
      heights.map((height) => ({ length, width, height })),
    ),
  )
}

const formatRoom = ({ length, width, height }: Room) =>
  `${length} x ${width} x ${height}`

/**
 * What a placed config shows: every listener-level speaker that isn't
 * ideal, every overhead that isn't, and every ideal gap, each as
 * "room layout channel".
 */
function survey(placed: Config) {
  const { speakers, overheads, idealGaps } = placeItems(placed)
  const label = (channel: string) =>
    `${formatRoom(placed.room)} ${placed.layout.dolbyLayout} ${channel}`
  return {
    speakers: speakers
      .filter(({ placementRange }) => placementRange.grade !== 'ideal')
      .map(({ channel }) => label(channel)),
    overheads: overheads
      .filter(({ placementRange }) => placementRange.grade !== 'ideal')
      .map(({ channel }) => label(channel)),
    gaps: idealGaps.map(({ channel }) => label(channel)),
  }
}

/** The surveys of `configs`, merged. */
function surveyAll(configs: readonly Config[]) {
  const found = configs.map(survey)
  return {
    speakers: found.flatMap(({ speakers }) => speakers),
    overheads: found.flatMap(({ overheads }) => overheads),
    gaps: found.flatMap(({ gaps }) => gaps),
  }
}

describe('every speaker ideal wherever the room allows, across rooms (#151)', () => {
  it.each([2.4, 2.6, 2.8, 3])(
    'around the auto MLP under a %f m ceiling, rooms 3.5–9 x 3–7 m, every v1 layout: every listener-level speaker ideal; a gap for exactly the overheads that are not',
    (height) => {
      // Every 0.5 m of length and width: 108 rooms x 8 layouts. Heavy on
      // purpose (HEAVY_TEST_TIMEOUT_MS).
      const found = surveyAll(
        rooms(steps(3.5, 9, 0.5), steps(3, 7, 0.5), [height]).flatMap((room) =>
          LAYOUTS.map((layout) => config(layout, room)),
        ),
      )

      expect(found.speakers).toEqual([])
      expect(found.gaps).toEqual(found.overheads)
      // The rooms where no ideal point exists, as #150 found them: the top
      // front, 3.5 m long under 2.8 m or more, 4 m long under 3 m.
      const short =
        height >= 2.8 ? [3.5, ...(height >= 3 ? [4] : [])] : ([] as number[])
      expect(found.gaps).toEqual(
        rooms(short, steps(3, 7, 0.5), [height]).flatMap((room) =>
          ['5.1.4', '7.1.4'].flatMap((layout) =>
            ['Ltf', 'Rtf'].map(
              (channel) => `${formatRoom(room)} ${layout} ${channel}`,
            ),
          ),
        ),
      )
    },
    HEAVY_TEST_TIMEOUT_MS,
  )

  it.each(
    [2.4, 2.6, 2.8, 3].flatMap((height) =>
      (['2.1', '3.1', '5.1', '7.1'] as const).map(
        (bed) => [bed, height] as const,
      ),
    ),
  )(
    'after Auto-place, %s and its overhead layouts under a %f m ceiling: every listener-level speaker ideal; a gap for exactly the overheads that are not',
    (bed, height) => {
      // Rooms 3.5–9 x 3–7 m as #150's sweep: 32 Auto-places. The overheads
      // don't move the recommended seat (seat-score.ts), so x.1.2 and
      // x.1.4 reuse their bed's. Heavy on purpose (HEAVY_TEST_TIMEOUT_MS).
      const tops = LAYOUTS.filter(
        (layout) => layout !== bed && layout.startsWith(bed),
      )
      const found = surveyAll(
        rooms([3.5, 4, 4.5, 5, 5.5, 6, 7, 9], [3, 4, 5, 7], [height]).flatMap(
          (room) => {
            const placed = withAutoPlacement(config(bed, room))
            return [bed, ...tops].map((dolbyLayout) => ({
              ...placed,
              layout: { ...placed.layout, dolbyLayout },
            }))
          },
        ),
      )

      expect(found.speakers).toEqual([])
      expect(found.gaps).toEqual(found.overheads)
    },
    HEAVY_TEST_TIMEOUT_MS,
  )
})
