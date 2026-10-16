import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  SCREEN_FRONT_STAGE,
  type ChannelId,
  type Config,
  type Layout,
  type Room,
  type RoomScreen,
} from '@/domain'
import { centerLineProjection, placeSpeakers } from '@/domain/placements'
import { azimuthFromMlp } from '@/domain/room'

// The default room is 6 x 4.5 x 2.6 m with the auto MLP on the centre line
// at 38% of the length (2.28 m from the front wall), at ear height (1.2 m).
// Auto-place puts the front stage 0.5 m from the front wall, 1.78 m ahead
// of the MLP.
const MLP_Y = 2.28
const LINE = 0.5
const AHEAD = MLP_Y - LINE

const SEVEN_ONE_FOUR: Layout = { dolbyLayout: '7.1.4', subwoofers: 2 }

function withScreen(
  screen: RoomScreen | null,
  overrides: Partial<Config> = {},
): Config {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    roomObjects: { ...DEFAULT_CONFIG.roomObjects, screen },
  }
}

function tv(width: number, extra: Partial<RoomScreen> = {}): RoomScreen {
  return {
    kind: 'tv',
    width,
    height: (width * 9) / 16,
    bottomEdge: 0.93,
    x: 0,
    standoff: null,
    ...extra,
  }
}

function projection(
  width: number,
  standoff: number | null,
  extra: Partial<RoomScreen> = {},
): RoomScreen {
  return {
    kind: 'projection',
    width,
    height: (width * 9) / 16,
    bottomEdge: 0.6,
    x: 0,
    standoff,
    ...extra,
  }
}

function speaker(config: Config, channel: ChannelId) {
  const found = analyzeRoom(config).speakers.find((s) => s.channel === channel)
  if (!found) throw new Error(`no ${channel} speaker`)
  return found
}

/** The azimuth (degrees on its own side) the screen rule aims L at. */
function edgeTarget(seenEdge: number, line = LINE): number {
  return (Math.atan(seenEdge / (MLP_Y - line)) * 180) / Math.PI
}

describe('auto-place with a screen', () => {
  it('has typed reference values, each marked as ours with its sources', () => {
    expect(SCREEN_FRONT_STAGE.edgeClearance).toBe(0.15)
    expect(SCREEN_FRONT_STAGE.centerClearance).toBe(0.15)
    expect(SCREEN_FRONT_STAGE.behindScreenGap).toBe(0.1)
    expect(SCREEN_FRONT_STAGE.note).toMatch(/ours/i)
    expect(SCREEN_FRONT_STAGE.citations.length).toBeGreaterThan(0)
  })

  describe('a medium TV (2 m wide): L/R just outside its edges', () => {
    const config = withScreen(tv(2))
    // The 1 m edge seen at the front-stage line, then the clearance outward.
    const seen = (1 * AHEAD) / MLP_Y + SCREEN_FRONT_STAGE.edgeClearance

    it('puts L and R on the front-stage line where the edge plus the clearance is seen', () => {
      const left = speaker(config, 'L')
      const right = speaker(config, 'R')

      expect(left.position.x).toBeCloseTo(-seen, 9)
      expect(left.position.y).toBeCloseTo(LINE, 9)
      expect(right.position.x).toBeCloseTo(seen, 9)
      expect(left.placementRange.azimuth.degrees).toBeCloseTo(
        -edgeTarget(seen),
        9,
      )
      expect(left.placementRange.grade).toBe('ideal')
      expect(right.placementRange.grade).toBe('ideal')
    })

    it('says they are at the screen edge', () => {
      expect(speaker(config, 'L').screenRelation).toEqual({
        kind: 'outside-edge',
      })
      expect(speaker(config, 'R').screenRelation).toEqual({
        kind: 'outside-edge',
      })
    })

    it('moves L/R live when the width changes', () => {
      const wider = speaker(withScreen(tv(2.2)), 'L').position.x
      expect(wider).toBeLessThan(speaker(config, 'L').position.x)
      expect(speaker(withScreen(tv(2.2)), 'L').placementRange.grade).toBe(
        'ideal',
      )
    })

    it('puts C below the TV, nearer ear height than above it', () => {
      const center = speaker(config, 'C')
      const t = AHEAD / MLP_Y
      const seenBottom = 1.2 + (0.93 - 1.2) * t
      expect(center.position.x).toBeCloseTo(0, 9)
      expect(center.position.y).toBeCloseTo(LINE, 9)
      expect(center.position.z).toBeCloseTo(
        seenBottom - SCREEN_FRONT_STAGE.centerClearance,
        9,
      )
      expect(center.screenRelation).toEqual({ kind: 'below' })
      expect(center.placementRange.grade).toBe('ideal')
    })
  })

  describe('a narrow TV (1 m wide): the screen rule is clamped to Dolby', () => {
    const config = withScreen(tv(1))
    const seen = (0.5 * AHEAD) / MLP_Y + SCREEN_FRONT_STAGE.edgeClearance

    it("widens L/R to Dolby's 22° and says so", () => {
      const left = speaker(config, 'L')
      expect(left.placementRange.azimuth.degrees).toBeCloseTo(-22, 9)
      expect(left.placementRange.grade).toBe('ideal')
      expect(left.screenRelation).toEqual({
        kind: 'clamped',
        limit: 'min',
        screenAngle: expect.closeTo(edgeTarget(seen), 9) as number,
        dolbyAngle: 22,
        behindScreen: false,
      })
      expect(speaker(config, 'R').placementRange.azimuth.degrees).toBeCloseTo(
        22,
        9,
      )
    })
  })

  describe('a wide solid projection screen (3.5 m wide)', () => {
    const config = withScreen(projection(3.5, null))

    it("narrows L/R to Dolby's 30°, in front of the image, and says so", () => {
      const left = speaker(config, 'L')
      expect(left.placementRange.azimuth.degrees).toBeCloseTo(-30, 9)
      expect(left.placementRange.grade).toBe('ideal')
      expect(left.screenRelation).toMatchObject({
        kind: 'clamped',
        limit: 'max',
        dolbyAngle: 30,
        behindScreen: false,
      })
    })
  })

  describe('an acoustically transparent screen', () => {
    // 2 m wide, 0.75 m off the wall: the front stage stays 0.5 m from the
    // wall, behind the screen.
    const config = withScreen(projection(2, 0.75))
    const t = AHEAD / (MLP_Y - 0.75)
    const seen = 1 * t - SCREEN_FRONT_STAGE.edgeClearance

    it('puts L/R behind the screen, just inside its edges', () => {
      const left = speaker(config, 'L')
      expect(left.position.x).toBeCloseTo(-seen, 9)
      expect(left.position.y).toBeCloseTo(LINE, 9)
      expect(left.placementRange.grade).toBe('ideal')
      expect(left.screenRelation).toEqual({ kind: 'inside-edge' })
    })

    it('puts C behind the screen on the centre line at ear height', () => {
      const center = speaker(config, 'C')
      expect(center.position).toEqual({
        x: expect.closeTo(0, 9) as number,
        y: expect.closeTo(LINE, 9) as number,
        z: 1.2,
      })
      expect(center.screenRelation).toEqual({ kind: 'behind' })
    })

    it('keeps a wide one (3 m) inside Dolby: L/R at 30°, behind the image', () => {
      const left = speaker(withScreen(projection(3, 0.75)), 'L')
      expect(left.placementRange.azimuth.degrees).toBeCloseTo(-30, 9)
      expect(left.screenRelation).toMatchObject({
        kind: 'clamped',
        limit: 'max',
        behindScreen: true,
      })
    })

    it('moves the front stage nearer the wall to stay behind a screen closer than 0.6 m', () => {
      const center = speaker(withScreen(projection(2, 0.5)), 'C')
      expect(center.position.y).toBeCloseTo(
        0.5 - SCREEN_FRONT_STAGE.behindScreenGap,
        9,
      )
      expect(center.screenRelation).toEqual({ kind: 'behind' })
    })

    it('treats one too close to the wall to stand behind like a solid screen', () => {
      const config = withScreen(projection(2, 0.2, { bottomEdge: 0.93 }))
      const center = speaker(config, 'C')
      expect(center.position.y).toBeCloseTo(LINE, 9)
      expect(center.screenRelation).toEqual({ kind: 'below' })
      expect(speaker(config, 'L').screenRelation).toEqual({
        kind: 'outside-edge',
      })
    })
  })

  describe('the centre around a solid screen', () => {
    it('goes above an image that is mostly below ear height', () => {
      const center = speaker(
        withScreen(tv(1.6, { bottomEdge: 0.4, height: 0.9 })),
        'C',
      )
      expect(center.screenRelation).toEqual({ kind: 'above' })
      expect(center.position.z).toBeGreaterThan(1.2)
    })

    it('stays at ear height, in front of the image, when neither below nor above fits', () => {
      const room: Room = { length: 15, width: 4.5, height: 2.6 }
      const center = speaker(
        withScreen(projection(3, null, { bottomEdge: 0.05, height: 2.55 }), {
          room,
        }),
        'C',
      )
      expect(center.position.z).toBe(1.2)
      expect(center.screenRelation).toEqual({ kind: 'in-front' })
    })

    it('stays at ear height when the screen is off to the side', () => {
      const config = withScreen(tv(1, { x: 1.5 }))
      const center = speaker(config, 'C')
      expect(center.position.z).toBe(1.2)
      expect(center.screenRelation).toEqual({ kind: 'clear' })
      // Both edges are right of the MLP: L widens to 22°, R narrows to 30°.
      expect(speaker(config, 'L').screenRelation).toMatchObject({
        kind: 'clamped',
        limit: 'min',
      })
      expect(speaker(config, 'R').screenRelation).toMatchObject({
        kind: 'clamped',
        limit: 'max',
      })
    })

    it('stays at ear height when the image is above it', () => {
      const center = speaker(
        withScreen(projection(2.5, null, { bottomEdge: 1.6 })),
        'C',
      )
      expect(center.position.z).toBe(1.2)
      expect(center.screenRelation).toEqual({ kind: 'clear' })
    })
  })

  describe('everything else', () => {
    const noScreen = analyzeRoom(withScreen(null, { layout: SEVEN_ONE_FOUR }))

    it('removing the screen returns every speaker to the no-screen rule', () => {
      const screened = withScreen(tv(1), { layout: SEVEN_ONE_FOUR })
      const removed = analyzeRoom({
        ...screened,
        roomObjects: { ...screened.roomObjects, screen: null },
      })
      expect(analyzeRoom(screened).speakers).not.toEqual(noScreen.speakers)
      expect(removed.speakers).toEqual(noScreen.speakers)
      for (const { channel, position, screenRelation } of noScreen.speakers) {
        expect(screenRelation, channel).toBeNull()
        expect(position.z, channel).toBe(1.2)
      }
      expect(
        noScreen.speakers.find((s) => s.channel === 'L')?.placementRange.azimuth
          .degrees,
      ).toBeCloseTo(-26, 9)
    })

    it('leaves surrounds, overheads and subwoofers where they are without a screen', () => {
      const screened = analyzeRoom(
        withScreen(tv(2), { layout: SEVEN_ONE_FOUR }),
      )
      const surrounds = (analysis: typeof noScreen) =>
        analysis.speakers.filter(
          ({ channel }) => !['L', 'C', 'R'].includes(channel),
        )
      expect(surrounds(screened)).toEqual(surrounds(noScreen))
      expect(screened.overheads).toEqual(noScreen.overheads)
      expect(screened.subwoofers).toEqual(noScreen.subwoofers)
    })

    it('never moves a manual speaker, and says the screen rule does not apply to it', () => {
      const manual = { x: -1.2, y: 0.4, z: 1.1 }
      const left = speaker(
        withScreen(tv(2), { manualPositions: { L: manual } }),
        'L',
      )
      expect(left.position).toEqual(manual)
      expect(left.screenRelation).toEqual({ kind: 'manual' })
    })

    it('places the speakers of a candidate seat with the same rule', () => {
      // The seat score installs each seat's auto speakers for its
      // projection onto the center line (ADR 0005, amendment).
      const seat = { x: 0.4, y: 3, z: 1.2 }
      const installedFor = centerLineProjection(seat)
      const left = placeSpeakers(withScreen(tv(1)), {
        installedFor,
        heardAt: seat,
      }).find(({ reference }) => reference.channel === 'L')
      expect(left?.screenRelation).toMatchObject({ kind: 'clamped' })
      expect(azimuthFromMlp(installedFor, left?.position ?? seat)).toBeCloseTo(
        -22,
        9,
      )
    })
  })
})
