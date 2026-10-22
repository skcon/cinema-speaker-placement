import { describe, expect, it } from 'vitest'
import {
  placeItem,
  placeItemWith,
  placeMlp,
  placementPolicy,
} from './auto-place-policy'
import { DEFAULT_CONFIG, type Config } from '@/domain'

const LEFT_BY_HAND = { x: -1, y: 1, z: 1.2 }

const WITH_MANUAL_LEFT: Config = {
  ...DEFAULT_CONFIG,
  manualPositions: { L: LEFT_BY_HAND },
}

describe('an item’s placement policy', () => {
  it('is auto without a stored position', () => {
    expect(placementPolicy(DEFAULT_CONFIG, 'L')).toEqual({ placement: 'auto' })
  })

  it('is manual at its stored position', () => {
    expect(placementPolicy(WITH_MANUAL_LEFT, 'L')).toEqual({
      placement: 'manual',
      position: LEFT_BY_HAND,
    })
    expect(placementPolicy(WITH_MANUAL_LEFT, 'R')).toEqual({
      placement: 'auto',
    })
  })
})

describe('placing an item', () => {
  it('auto-places an auto item', () => {
    expect(
      placeItem(DEFAULT_CONFIG, 'L', () => ({ x: -2, y: 0.5, z: 1.2 })),
    ).toEqual({ position: { x: -2, y: 0.5, z: 1.2 }, placement: 'auto' })
  })

  it('leaves a manual item where it is, without auto-placing it: manual wins over auto', () => {
    let autoPlaced = 0
    const placed = placeItem(WITH_MANUAL_LEFT, 'L', () => {
      autoPlaced += 1
      return { x: -2, y: 0.5, z: 1.2 }
    })

    expect(placed).toEqual({ position: LEFT_BY_HAND, placement: 'manual' })
    expect(autoPlaced).toBe(0)
  })

  it('gives an item’s other facts from auto-place, or from where a manual one is', () => {
    const how = {
      auto: () => ({ position: { x: -2, y: 0.5, z: 1.2 }, note: 'auto' }),
      manual: ({ x }: { x: number }) => ({ note: `manual at ${x}` }),
    }

    expect(placeItemWith(DEFAULT_CONFIG, 'L', how)).toEqual({
      position: { x: -2, y: 0.5, z: 1.2 },
      placement: 'auto',
      note: 'auto',
    })
    expect(placeItemWith(WITH_MANUAL_LEFT, 'L', how)).toEqual({
      position: LEFT_BY_HAND,
      placement: 'manual',
      note: 'manual at -1',
    })
  })
})

describe('where the MLP is', () => {
  it('is the "38% rule" seed when auto: centered, at ear height, 38% of the room length back', () => {
    // The default room is 6 m long: 0.38 x 6 = 2.28 m.
    const { position, placement } = placeMlp(DEFAULT_CONFIG)

    expect(placement).toBe('auto')
    expect(position.x).toBe(0)
    expect(position.y).toBeCloseTo(2.28, 9)
    expect(position.z).toBe(1.2)
  })

  it('is where it was left when manual', () => {
    const seat = { x: 0.4, y: 3.1, z: 1.2 }

    expect(
      placeMlp({ ...DEFAULT_CONFIG, manualPositions: { MLP: seat } }),
    ).toEqual({ position: seat, placement: 'manual' })
  })
})
