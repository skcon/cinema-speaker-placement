import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type Config } from '@/domain'
import { itemDistances } from '@/domain/item-distances'
import { placeItems, positionOf, selectedItem } from '@/domain/placed-items'
import { placeAll } from '@/domain/placements'
import { defaultScreen } from '@/domain/screen'

/** The default room (6 x 4.5 x 2.6 m) with a 7.1.4 layout and two subwoofers. */
const SEVEN_ONE_FOUR: Config = {
  ...DEFAULT_CONFIG,
  layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
}

/** The default Screen for the default room, on its front wall. */
const SCREEN = defaultScreen(DEFAULT_CONFIG.room)

describe('the placed items by id', () => {
  it('are every item of the layout: its channels, overhead channels, subwoofers, then the MLP', () => {
    const { items } = placeItems(SEVEN_ONE_FOUR)

    expect([...items.keys()]).toEqual([
      'L',
      'C',
      'R',
      'Ls',
      'Rs',
      'Lrs',
      'Rrs',
      'Ltf',
      'Rtf',
      'Ltr',
      'Rtr',
      'Sub1',
      'Sub2',
      'MLP',
    ])
    expect(items.get('Ltm')).toBeUndefined()
    expect(items.get('Sub3')).toBeUndefined()
  })

  it('give each item its kind, name, position and placement, as the lists have them', () => {
    const config: Config = {
      ...SEVEN_ONE_FOUR,
      manualPositions: { Sub2: { x: 1, y: 5.7, z: 0.3 } },
    }
    const { mlp, mlpPlacement, speakers, overheads, subwoofers, items } =
      placeItems(config)

    expect(items.get('Ls')).toMatchObject({
      kind: 'listenerLevel',
      id: 'Ls',
      name: 'Left Surround',
      position: speakers[3]!.position,
      placement: 'auto',
    })
    expect(items.get('Rtr')).toMatchObject({
      kind: 'overhead',
      id: 'Rtr',
      name: 'Right Top Rear',
      position: overheads[3]!.position,
    })
    expect(items.get('Sub2')).toMatchObject({
      kind: 'subwoofer',
      id: 'Sub2',
      name: 'Subwoofer 2',
      position: { x: 1, y: 5.7, z: 0.3 },
      placement: 'manual',
      wall: subwoofers[1]!.wall,
    })
    expect(items.get('MLP')).toEqual({
      kind: 'mlp',
      id: 'MLP',
      name: 'MLP',
      position: mlp,
      placement: mlpPlacement,
      grading: null,
      aim: null,
      screenRelation: null,
    })
  })

  it('grade a listener-level speaker and an overhead by their placement-range checks, and a subwoofer as ungraded', () => {
    const { speakers, overheads, items } = placeItems(SEVEN_ONE_FOUR)

    expect(items.get('L')?.grading).toEqual({
      kind: 'speaker',
      check: speakers[0]!.placementRange,
    })
    expect(items.get('Ltf')?.grading).toEqual({
      kind: 'overhead',
      check: overheads[0]!.placementRange,
    })
    expect(items.get('Sub1')?.grading).toEqual({ kind: 'subwoofer' })
  })

  it('aim only the listener-level speakers, and relate only L, C and R to the Screen', () => {
    const { speakers, items } = placeItems({
      ...SEVEN_ONE_FOUR,
      roomObjects: { ...SEVEN_ONE_FOUR.roomObjects, screen: SCREEN },
    })

    expect(items.get('R')?.aim).toEqual(speakers[2]!.aim)
    expect(items.get('R')?.screenRelation).not.toBeNull()
    expect(items.get('R')?.screenRelation).toEqual(speakers[2]!.screenRelation)
    expect(items.get('Ls')?.screenRelation).toBeNull()
    for (const id of ['Ltf', 'Sub1', 'MLP'] as const) {
      expect(items.get(id)?.aim).toBeNull()
      expect(items.get(id)?.screenRelation).toBeNull()
    }
  })

  it('are where placeAll puts them', () => {
    const config: Config = {
      ...SEVEN_ONE_FOUR,
      manualPositions: {
        MLP: { x: 0.4, y: 3.1, z: 1.2 },
        Ltr: { x: -1, y: 4.2, z: 2.6 },
      },
    }
    const placements = placeAll(config)
    const { items } = placeItems(config)

    expect(items.get('MLP')?.position).toEqual(placements.mlp.position)
    expect(items.get('C')?.position).toEqual(placements.speakers[1]!.position)
    expect(items.get('Ltr')?.position).toEqual({ x: -1, y: 4.2, z: 2.6 })
    expect(items.get('Sub2')?.position).toEqual(
      placements.subwoofers[1]!.position,
    )
  })
})

describe('where one item is', () => {
  it('is its manual position, or its auto-placed one', () => {
    const config: Config = {
      ...SEVEN_ONE_FOUR,
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

describe('the Selected item', () => {
  const placed = placeItems(SEVEN_ONE_FOUR)
  const { room } = SEVEN_ONE_FOUR

  it('is nothing when nothing is selected', () => {
    expect(selectedItem(room, placed, null)).toBeNull()
  })

  it('is nothing when the selected item is not in the layout', () => {
    expect(selectedItem(room, placed, 'Ltm')).toBeNull()
    expect(selectedItem(room, placed, 'Sub4')).toBeNull()
  })

  it('is the placed item, with its distances to its two nearest walls and the MLP', () => {
    const item = selectedItem(room, placed, 'L')

    expect(item).toMatchObject(placed.items.get('L')!)
    expect(item?.distances).toEqual(
      itemDistances(room, placed.items.get('L')!.position, placed.mlp),
    )
    // Hand-computed in src/domain/item-distances.test.ts.
    expect(item?.distances.walls.map(({ wall }) => wall)).toEqual([
      'front',
      'left',
    ])
    expect(item?.distances.mlp?.meters).toBeCloseTo(1.98043, 4)
  })

  it('measures an overhead and a subwoofer to the MLP too', () => {
    expect(selectedItem(room, placed, 'Rtf')?.distances.mlp).not.toBeNull()
    expect(selectedItem(room, placed, 'Sub2')?.distances.mlp).not.toBeNull()
  })

  it('is the MLP with its distances to the walls only', () => {
    const item = selectedItem(room, placed, 'MLP')

    expect(item).toMatchObject({
      id: 'MLP',
      name: 'MLP',
      position: placed.mlp,
      placement: 'auto',
      grading: null,
      screenRelation: null,
    })
    expect(item?.distances.mlp).toBeNull()
    expect(item?.distances.walls).toHaveLength(2)
  })
})
