import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type Config } from '@/domain'
import { placeAll, positionOf } from '@/domain/placements'

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

describe('where one item is', () => {
  it('is its manual position, or its auto-placed one', () => {
    const config: Config = {
      ...SEVEN_TWO,
      manualPositions: { MLP: { x: 0.5, y: 3, z: 1.2 } },
    }

    expect(positionOf(config, 'MLP')).toEqual({ x: 0.5, y: 3, z: 1.2 })
    // The Center sits on the front-stage line, 0.5 m from the front wall,
    // whatever the MLP.
    expect(positionOf(config, 'C')?.y).toBeCloseTo(0.5, 9)
    expect(positionOf(config, 'C')?.z).toBe(1.2)
    expect(positionOf(config, 'Sub2')).toEqual(
      placeAll(config).subwoofers[1]?.position,
    )
  })

  it('is null for an item the layout does not have', () => {
    expect(positionOf(DEFAULT_CONFIG, 'Lrs')).toBeNull()
    expect(positionOf(DEFAULT_CONFIG, 'Sub3')).toBeNull()
  })
})
