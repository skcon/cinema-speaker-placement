import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type DolbyLayout,
  type OverheadChannelId,
  type Room,
} from '@/domain'

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
    // 5.1 bed: Ls/Rs at ±115°, 1.98 m from the MLP, are the outermost:
    // 2 x 1.98 sin 115° = 3.589 m wide, so the pair is ±1.077 m.
    const analysis = analyzeRoom(config('5.1.4'))

    expect(overhead(analysis, 'Ltf').position.x).toBeCloseTo(-1.077, 3)
    expect(overhead(analysis, 'Rtf').position.x).toBeCloseTo(1.077, 3)
    expect(overhead(analysis, 'Ltr').position.x).toBeCloseTo(-1.077, 3)
    // atan(1.077 / 1.4) = 37.6°: inside 30°–60°
    expect(overhead(analysis, 'Rtf').placementRange.azimuth).toMatchObject({
      shown: 38,
      grade: 'ideal',
    })
    expect(overhead(analysis, 'Rtr').placementRange.azimuth).toMatchObject({
      shown: 142,
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
