import { describe, expect, it } from 'vitest'
import { placeSpeakers } from './placements'
import { LEFT_RIGHT_AIM } from './reference'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  formatLayout,
  type ChannelId,
  type Config,
  type Layout,
  type Room,
  type RoomPoint,
} from '@/domain'

function config(room: Room, layout: Layout = DEFAULT_CONFIG.layout): Config {
  return { ...DEFAULT_CONFIG, room, layout }
}

function speaker(analysis: ReturnType<typeof analyzeRoom>, channel: ChannelId) {
  const found = analysis.speakers.find((s) => s.channel === channel)
  if (!found) throw new Error(`no ${channel} speaker`)
  return found
}

function horizontalDistance(a: RoomPoint, b: RoomPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const FIVE_ONE: Layout = { dolbyLayout: '5.1', subwoofers: 1 }
const SEVEN_ONE: Layout = { dolbyLayout: '7.1', subwoofers: 1 }

describe('auto-placed listener-level speakers', () => {
  it('sit at seated ear height, 1.2 m', () => {
    const { speakers } = analyzeRoom(DEFAULT_CONFIG)

    for (const { position } of speakers) expect(position.z).toBe(1.2)
  })

  it("aim L/R at 29° (Dolby's 30° reference, 1° inside the ideal range's edge) and every other channel at the middle of its ideal range, to the nearest whole degree, on its side of the room", () => {
    const fiveOne = analyzeRoom(config(DEFAULT_CONFIG.room, FIVE_ONE))
    const sevenOne = analyzeRoom(config(DEFAULT_CONFIG.room, SEVEN_ONE))
    const azimuth = (
      analysis: ReturnType<typeof analyzeRoom>,
      channel: ChannelId,
    ) => speaker(analysis, channel).placementRange.azimuth.degrees

    // L/R 22°–30°, Ls/Rs 110°–120° (5.1), 90°–110° (7.1), Lrs/Rrs 135°–150°
    expect(azimuth(fiveOne, 'C')).toBeCloseTo(0, 9)
    // L/R: LEFT_RIGHT_AIM, 30° less its 1° margin (#121), not the middle 26°
    expect(azimuth(fiveOne, 'L')).toBeCloseTo(-29, 9)
    expect(azimuth(fiveOne, 'R')).toBeCloseTo(29, 9)
    expect(azimuth(fiveOne, 'Ls')).toBeCloseTo(-115, 9)
    expect(azimuth(fiveOne, 'Rs')).toBeCloseTo(115, 9)
    expect(azimuth(sevenOne, 'Ls')).toBeCloseTo(-100, 9)
    // 142.5° rounds to a whole degree, the resolution of Dolby's ranges
    expect(azimuth(sevenOne, 'Rrs')).toBeCloseTo(143, 9)
    expect(azimuth(sevenOne, 'Lrs')).toBeCloseTo(-143, 9)
  })

  it('aim at the MLP: yaw is degrees clockwise from facing the front wall', () => {
    const analysis = analyzeRoom(config(DEFAULT_CONFIG.room, FIVE_ONE))
    const yaw = (channel: ChannelId) => speaker(analysis, channel).aim.yaw

    // The Center faces straight back at the MLP; Left (at -29°) faces back
    // and toward the right, 180° - 29°; Left Surround (at -115°) faces
    // forward and to the right, 180° - 115°.
    expect(yaw('C')).toBeCloseTo(180, 9)
    expect(yaw('L')).toBeCloseTo(151, 9)
    expect(yaw('R')).toBeCloseTo(-151, 9)
    expect(yaw('Ls')).toBeCloseTo(65, 9)
    expect(yaw('Rs')).toBeCloseTo(-65, 9)
  })

  it('put the front stage on its angles, 0.5 m from the front wall (our front-stage distance)', () => {
    // Default room: MLP 2.28 m from the front wall, so the Center is 1.78 m
    // away and Left at -29° is 1.78 / cos 29° = 2.035 m away (1.980 m at
    // the middle 26° before #121).
    const analysis = analyzeRoom(DEFAULT_CONFIG)
    const center = speaker(analysis, 'C')
    const left = speaker(analysis, 'L')
    const right = speaker(analysis, 'R')

    expect(center.position.x).toBeCloseTo(0, 9)
    expect(center.position.y).toBeCloseTo(0.5, 9)
    expect(left.position.y).toBeCloseTo(0.5, 9)
    expect(right.position.y).toBeCloseTo(0.5, 9)
    expect(left.position.x).toBeCloseTo(
      -1.78 * Math.tan((29 * Math.PI) / 180),
      9,
    )
    expect(right.position.x).toBeCloseTo(-left.position.x, 9)
    expect(horizontalDistance(left.position, analysis.mlp)).toBeCloseTo(
      2.035,
      3,
    )
  })

  it('put the surrounds on their angles at the side walls, not on a circle around the MLP', () => {
    // Default room 4.5 m wide: the side clearance lines are 1.95 m from the
    // center line. Ls at -115° meets its line 1.95 / sin 115° = 2.152 m
    // from the MLP, 0.909 m behind it.
    const analysis = analyzeRoom(config(DEFAULT_CONFIG.room, FIVE_ONE))
    const ls = speaker(analysis, 'Ls')
    const rs = speaker(analysis, 'Rs')

    expect(ls.position.x).toBeCloseTo(-1.95, 9)
    expect(rs.position.x).toBeCloseTo(1.95, 9)
    expect(ls.position.y).toBeCloseTo(3.189, 3)
    expect(horizontalDistance(ls.position, analysis.mlp)).toBeCloseTo(2.152, 3)
  })

  it('put the rear surrounds at the side or back wall, whichever their angle reaches first', () => {
    // 7.1 Lrs at -143°. Default room: the side line is 1.95 / sin 143° =
    // 3.240 m away, the back line (5.7 m) 3.42 / cos 37° = 4.282 m: the side
    // wall comes first, 2.588 m behind the MLP. In a 10 m wide, 4 m long
    // room the back line comes first: Lrs sits 0.3 m from the back wall.
    const inDefault = speaker(
      analyzeRoom(config(DEFAULT_CONFIG.room, SEVEN_ONE)),
      'Lrs',
    )
    const wide = speaker(
      analyzeRoom(config({ length: 4, width: 10, height: 2.6 }, SEVEN_ONE)),
      'Lrs',
    )

    expect(inDefault.position.x).toBeCloseTo(-1.95, 9)
    expect(inDefault.position.y).toBeCloseTo(4.868, 3)
    expect(wide.position.y).toBeCloseTo(3.7, 9)
    expect(wide.position.x).toBeGreaterThan(-4.7)
    expect(wide.placementRange.azimuth.degrees).toBeCloseTo(-143, 9)
  })

  it('bring a front speaker closer along its angle when a side wall comes before the front-stage line', () => {
    // 2 m wide: 0.7 m from the center line to the side clearance. Left at
    // -29° meets it 0.7 / sin 29° = 1.444 m from the MLP, long before the
    // front-stage line 5.2 m ahead.
    const analysis = analyzeRoom(config({ length: 15, width: 2, height: 2.4 }))
    const left = speaker(analysis, 'L')

    expect(left.position.x).toBeCloseTo(-0.7, 9)
    expect(horizontalDistance(left.position, analysis.mlp)).toBeCloseTo(
      1.444,
      3,
    )
    expect(left.placementRange.azimuth.degrees).toBeCloseTo(-29, 9)
    expect(speaker(analysis, 'C').position.y).toBeCloseTo(0.5, 9)
  })

  it('fall back to the wall clearance for the front stage when the MLP is nearer the front wall than 0.5 m', () => {
    const analysis = analyzeRoom({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 0.4, z: 1.2 } },
    })

    expect(speaker(analysis, 'C').position.y).toBeCloseTo(0.3, 9)
  })
})

/**
 * Dolby's listener-level azimuth ranges (signed: left is negative), from
 * docs/research/dolby-speaker-placement.md section 3.
 */
const FRONT = { L: [-30, -22], C: [0, 0], R: [22, 30] } as const
const BED_5 = { ...FRONT, Ls: [-120, -110], Rs: [110, 120] } as const
const BED_7 = {
  ...FRONT,
  Ls: [-110, -90],
  Rs: [90, 110],
  Lrs: [-150, -135],
  Rrs: [135, 150],
} as const

const V1_LAYOUTS: [Layout, Partial<Record<ChannelId, readonly number[]>>][] = [
  [
    { dolbyLayout: '2.1', subwoofers: 1 },
    { L: FRONT.L, R: FRONT.R },
  ],
  [{ dolbyLayout: '3.1', subwoofers: 1 }, FRONT],
  [{ dolbyLayout: '5.1', subwoofers: 1 }, BED_5],
  [{ dolbyLayout: '7.1', subwoofers: 1 }, BED_7],
  [{ dolbyLayout: '5.1.2', subwoofers: 1 }, BED_5],
  [{ dolbyLayout: '5.1.4', subwoofers: 1 }, BED_5],
  [{ dolbyLayout: '7.1.2', subwoofers: 1 }, BED_7],
  [{ dolbyLayout: '7.1.4', subwoofers: 1 }, BED_7],
]

/** Valid rooms from the smallest to the largest, with the odd shapes in between. */
const ROOMS: Room[] = [
  { length: 2, width: 2, height: 2 },
  { length: 6, width: 4.5, height: 2.6 },
  { length: 15, width: 15, height: 5 },
  { length: 15, width: 2, height: 2.4 },
  { length: 2, width: 15, height: 2.4 },
  { length: 3.5, width: 5.5, height: 2.4 },
  { length: 4, width: 4, height: 2.2 },
  { length: 8, width: 3, height: 3 },
  { length: 10, width: 6, height: 3.5 },
]

describe.each(
  V1_LAYOUTS.map(
    ([layout, ranges]) => [formatLayout(layout), layout, ranges] as const,
  ),
)('%s auto-placed', (_, layout, ranges) => {
  it.each(
    ROOMS.map((room) => [room.length, room.width, room.height, room] as const),
  )(
    'in a %f x %f x %f m room: every speaker inside its cited range and at least 0.3 m from every wall',
    (_length, _width, _height, room) => {
      const { speakers } = analyzeRoom(config(room, layout))

      expect(speakers.map(({ channel }) => channel)).toEqual(
        Object.keys(ranges),
      )
      for (const { channel, position, placementRange } of speakers) {
        const [min = Number.NaN, max = Number.NaN] = ranges[channel] ?? []
        expect(placementRange.azimuth.degrees).toBeGreaterThanOrEqual(
          min - 1e-9,
        )
        expect(placementRange.azimuth.degrees).toBeLessThanOrEqual(max + 1e-9)
        expect(placementRange.grade).toBe('ideal')

        expect(position.x).toBeGreaterThanOrEqual(-room.width / 2 + 0.3 - 1e-9)
        expect(position.x).toBeLessThanOrEqual(room.width / 2 - 0.3 + 1e-9)
        expect(position.y).toBeGreaterThanOrEqual(0.3 - 1e-9)
        expect(position.y).toBeLessThanOrEqual(room.length - 0.3 + 1e-9)
        expect(position.z).toBeGreaterThan(0)
        expect(position.z).toBeLessThan(room.height)
      }
    },
  )
})

/** Rooms 4–9 m long, narrow to wide (#121's acceptance sweep). */
const TRIANGLE_ROOMS: Room[] = [4, 5, 6, 7, 8, 9].flatMap((length) =>
  [3, 4.5, 6, 7].map((width) => ({ length, width, height: 2.6 })),
)

describe('the front stage and the auto MLP form a near-equilateral triangle (#121)', () => {
  it("aims L/R at Dolby's 30° reference less a 1° margin to the ideal range's edge, and cites Dolby", () => {
    expect(LEFT_RIGHT_AIM.nominal).toBe(30)
    expect(LEFT_RIGHT_AIM.edgeMargin).toBe(1)
    expect(LEFT_RIGHT_AIM.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'IG', page: 7 }),
        expect.objectContaining({ source: 'IG', page: 8, figure: 'fig.3' }),
      ]),
    )
  })

  it.each(
    TRIANGLE_ROOMS.map((room) => [room.length, room.width, room] as const),
  )(
    'in a %f x %f m room: L–R spacing ÷ MLP→L is within [0.95, 1.05], and every grade is ideal',
    (_length, _width, room) => {
      for (const [layout] of V1_LAYOUTS) {
        const analysis = analyzeRoom(config(room, layout))
        const mlp = analysis.mlp
        const left = speaker(analysis, 'L').position
        const right = speaker(analysis, 'R').position

        const ratio =
          horizontalDistance(left, right) / horizontalDistance(mlp, left)
        expect(ratio).toBeGreaterThanOrEqual(0.95)
        expect(ratio).toBeLessThanOrEqual(1.05)
        // 2 sin 29° = 0.970 whatever the room: the angle always holds, and
        // a side wall only brings L and R in along it, both alike.
        expect(ratio).toBeCloseTo(2 * Math.sin((29 * Math.PI) / 180), 9)
        for (const { placementRange } of analysis.speakers) {
          expect(placementRange.grade).toBe('ideal')
        }
      }
    },
  )

  it.each(
    TRIANGLE_ROOMS.map((room) => [room.length, room.width, room] as const),
  )(
    'in a %f x %f m room: a seat 5% of the way forward to the front stage still hears every speaker as ideal (the margin)',
    (_length, _width, room) => {
      const fiveOne = config(room, FIVE_ONE)
      const analysis = analyzeRoom(fiveOne)
      const mlp = analysis.mlp
      // 5% of the way from the auto MLP to Left and Right as installed
      // (on the 0.5 m front-stage line, or nearer where a side wall stops
      // them).
      const stageY = speaker(analysis, 'L').position.y
      const forward = { ...mlp, y: mlp.y - 0.05 * (mlp.y - stageY) }
      const speakers = placeSpeakers(fiveOne, {
        installedFor: mlp,
        heardAt: forward,
      })

      for (const { reference, placementRange } of speakers) {
        expect([reference.channel, placementRange.grade]).toEqual([
          reference.channel,
          'ideal',
        ])
      }
      // At exactly 30° the same step would read 31°, acceptable: the
      // whole-degree grading leaves 30° only half a degree (about 2% of
      // the way forward).
      const left = speakers.find(({ reference }) => reference.channel === 'L')
      expect(left?.placementRange.azimuth.shown).toBe(30)
    },
  )
})
