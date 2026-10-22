import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type Config } from '@/domain'
import {
  centerLineProjection,
  placeAll,
  placeSpeakers,
} from '@/domain/placements'
import { azimuthFromMlp, type RoomPoint } from '@/domain/room'
import type { RoomScreen } from '@/domain/screen'

/** The default room (6 x 4.5 x 2.6 m) with a 7.2 layout. */
const SEVEN_TWO: Config = {
  ...DEFAULT_CONFIG,
  layout: { dolbyLayout: '7.1', subwoofers: 2 },
}

describe('placing every item of the layout', () => {
  it('lists the channels in Dolby order and the subwoofers from Subwoofer 1, all auto by default', () => {
    const { mlp, speakers, subwoofers } = placeAll(SEVEN_TWO)

    expect(speakers.map(({ reference }) => reference.channel)).toEqual([
      'L',
      'C',
      'R',
      'Ls',
      'Rs',
      'Lrs',
      'Rrs',
    ])
    expect(subwoofers.map(({ id }) => id)).toEqual(['Sub1', 'Sub2'])
    expect(
      [mlp, ...speakers, ...subwoofers].every(
        ({ placement }) => placement === 'auto',
      ),
    ).toBe(true)
    // The 38% rule, at ear height.
    expect(mlp.position.x).toBe(0)
    expect(mlp.position.y).toBeCloseTo(2.28, 9)
    expect(mlp.position.z).toBe(1.2)
  })

  it('uses the stored position of each manual item, and only of those', () => {
    const config: Config = {
      ...SEVEN_TWO,
      manualPositions: {
        Lrs: { x: -1, y: 5, z: 1.5 },
        Sub2: { x: 1, y: 5.7, z: 0.3 },
      },
    }

    const { speakers, subwoofers } = placeAll(config)

    expect(speakers.find((s) => s.reference.channel === 'Lrs')).toMatchObject({
      position: { x: -1, y: 5, z: 1.5 },
      placement: 'manual',
    })
    expect(subwoofers[1]).toMatchObject({
      position: { x: 1, y: 5.7, z: 0.3 },
      placement: 'manual',
      wall: 'back',
    })
    expect(subwoofers[0]?.placement).toBe('auto')
  })
})

describe('the speakers installed for one point, heard at another', () => {
  // The default room's 38% seat on the center line, and a seat 0.84 m left
  // of it at the same distance from the front wall.
  const SEAT: RoomPoint = { x: 0, y: 2.28, z: 1.2 }
  const LEFT_OF_SEAT: RoomPoint = { x: -0.84, y: 2.28, z: 1.2 }

  it('installed for and heard at the MLP, are the speakers placeAll places', () => {
    const config: Config = {
      ...SEVEN_TWO,
      manualPositions: {
        MLP: { x: 0.5, y: 3, z: 1.2 },
        Lrs: { x: -1, y: 5, z: 1.5 },
      },
    }
    const { mlp, speakers } = placeAll(config)

    expect(
      placeSpeakers(config, {
        installedFor: mlp.position,
        heardAt: mlp.position,
      }),
    ).toEqual(speakers)
  })

  it('places auto speakers around the install point and grades every speaker from the listening point', () => {
    const fromSeat = placeSpeakers(SEVEN_TWO, {
      installedFor: SEAT,
      heardAt: SEAT,
    })
    const offCenter = placeSpeakers(SEVEN_TWO, {
      installedFor: SEAT,
      heardAt: LEFT_OF_SEAT,
    })

    // The same install: every speaker stays where it is.
    expect(offCenter.map(({ position }) => position)).toEqual(
      fromSeat.map(({ position }) => position),
    )
    // Ideal from the seat it is installed for...
    expect(
      fromSeat.every(({ placementRange }) => placementRange.grade === 'ideal'),
    ).toBe(true)
    // ...but 0.84 m to the left, Left is seen at about 21°, just outside
    // its 22°-30°, and graded at that angle.
    const left = offCenter.find(({ reference }) => reference.channel === 'L')!
    expect(left.placementRange.grade).not.toBe('ideal')
    expect(left.placementRange.azimuth.degrees).toBeCloseTo(
      azimuthFromMlp(LEFT_OF_SEAT, left.position),
      9,
    )
  })

  it('keeps manual speakers where they are, whatever it is installed for', () => {
    const manual = { x: -1, y: 5, z: 1.5 }
    const config: Config = { ...SEVEN_TWO, manualPositions: { Lrs: manual } }

    const lrs = placeSpeakers(config, {
      installedFor: { x: 0, y: 1.5, z: 1.2 },
      heardAt: LEFT_OF_SEAT,
    }).find(({ reference }) => reference.channel === 'Lrs')

    expect(lrs).toMatchObject({ position: manual, placement: 'manual' })
  })

  it('fits the front stage to the screen as seen from the install point (#58)', () => {
    const tv: RoomScreen = {
      kind: 'tv',
      width: 1.4,
      height: (1.4 * 9) / 16,
      bottomEdge: 0.93,
      x: 0,
      standoff: null,
    }
    const config: Config = {
      ...SEVEN_TWO,
      roomObjects: { ...SEVEN_TWO.roomObjects, screen: tv },
    }
    const installed = (heardAt: RoomPoint) =>
      placeSpeakers(config, { installedFor: SEAT, heardAt }).map(
        ({ position, screenRelation }) => ({ position, screenRelation }),
      )

    // Where the listener sits doesn't move the front stage.
    expect(installed(LEFT_OF_SEAT)).toEqual(installed(SEAT))
    // L and R beside the TV, C below it.
    expect(
      installed(LEFT_OF_SEAT)
        .slice(0, 3)
        .map(({ screenRelation }) => screenRelation?.kind),
    ).toEqual(['clamped', 'below', 'clamped'])
  })

  describe('for a seat: installed symmetric to the room (ADR 0005, amendment)', () => {
    const forSeat = (seat: RoomPoint) =>
      placeSpeakers(SEVEN_TWO, {
        installedFor: centerLineProjection(seat),
        heardAt: seat,
      })

    it('installs for the seat’s projection onto the center line, the same distance from the front wall', () => {
      expect(centerLineProjection(LEFT_OF_SEAT)).toEqual(SEAT)
      expect(centerLineProjection(SEAT)).toEqual(SEAT)
    })

    it('leaves an off-center seat’s auto speakers where the center-line seat has them, mirror images across the center line', () => {
      const speakers = forSeat(LEFT_OF_SEAT)
      const at = (channel: string) =>
        speakers.find(({ reference }) => reference.channel === channel)!
          .position

      expect(speakers.map(({ position }) => position)).toEqual(
        forSeat(SEAT).map(({ position }) => position),
      )
      for (const [left, right] of [
        ['L', 'R'],
        ['Ls', 'Rs'],
        ['Lrs', 'Rrs'],
      ]) {
        expect(at(left!).x).toBeCloseTo(-at(right!).x, 9)
        expect(at(left!).y).toBeCloseTo(at(right!).y, 9)
      }
      expect(at('C').x).toBeCloseTo(0, 9)
    })

    it('grades them from the seat itself, so an off-center seat hears them at skewed angles', () => {
      const grades = (seat: RoomPoint) =>
        forSeat(seat).map(({ placementRange }) => placementRange.grade)

      expect(grades(SEAT).every((grade) => grade === 'ideal')).toBe(true)
      expect(grades(LEFT_OF_SEAT).some((grade) => grade !== 'ideal')).toBe(true)
    })
  })
})
