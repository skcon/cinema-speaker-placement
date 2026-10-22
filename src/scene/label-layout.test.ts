import { describe, expect, it } from 'vitest'
import {
  boxesOverlap,
  labelBox,
  layoutLabels,
  preferredPlacements,
  type LabelPlacement,
  type LabelToPlace,
  type ScreenBox,
} from '@/scene/label-layout'

const VIEW: ScreenBox = { left: 0, top: 0, right: 400, bottom: 300 }

function label(
  id: string,
  x: number,
  y: number,
  overrides: Partial<LabelToPlace> = {},
): LabelToPlace {
  return {
    id,
    anchor: { x, y },
    size: { width: 40, height: 30 },
    direction: { x: 0, y: 1 },
    gap: 10,
    ...overrides,
  }
}

function placedBoxes(
  labels: readonly LabelToPlace[],
  placements: ReadonlyMap<string, LabelPlacement>,
): ScreenBox[] {
  return labels.map((one) => {
    const placement = placements.get(one.id)
    if (!placement) throw new Error(`${one.id} not placed`)
    return labelBox(one, placement)
  })
}

function anyOverlap(boxes: readonly ScreenBox[]): boolean {
  return boxes.some((a, i) =>
    boxes.slice(i + 1).some((b) => boxesOverlap(a, b)),
  )
}

describe('label boxes', () => {
  it('overlap only when they share area, not when they touch', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 }

    expect(boxesOverlap(a, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(
      true,
    )
    expect(boxesOverlap(a, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(
      false,
    )
    expect(boxesOverlap(a, { left: 0, top: 11, right: 10, bottom: 20 })).toBe(
      false,
    )
  })

  it('are centered on the anchor plus the offset, at full or compact size', () => {
    const one = label('L', 100, 50, {
      compactSize: { width: 30, height: 15 },
    })

    expect(labelBox(one, { offset: { x: 5, y: 25 }, compact: false })).toEqual({
      left: 85,
      top: 60,
      right: 125,
      bottom: 90,
    })
    expect(labelBox(one, { offset: { x: 0, y: 0 }, compact: true })).toEqual({
      left: 85,
      top: 42.5,
      right: 115,
      bottom: 57.5,
    })
  })
})

describe('preferred label placements', () => {
  it('push a label off its anchor along its direction by half its size plus the gap', () => {
    const placements = preferredPlacements([
      label('below', 0, 0),
      label('right', 0, 0, { direction: { x: 1, y: 0 } }),
      label('centered', 0, 0, { direction: { x: 0, y: 0 } }),
    ])

    expect(placements.get('below')).toEqual({
      offset: { x: 0, y: 25 },
      compact: false,
    })
    expect(placements.get('right')).toEqual({
      offset: { x: 30, y: 0 },
      compact: false,
    })
    expect(placements.get('centered')).toEqual({
      offset: { x: 0, y: 0 },
      compact: false,
    })
  })
})

describe('label layout', () => {
  it('keeps every label at its preferred place when none collide', () => {
    const labels = [label('L', 50, 50), label('R', 250, 50)]

    expect(layoutLabels(labels, { obstacles: [], bounds: VIEW })).toEqual(
      preferredPlacements(labels),
    )
  })

  it('moves a label off one placed before it', () => {
    // Three speakers 20 px apart, each wanting its 40 px label right below.
    const labels = [
      label('L', 180, 50),
      label('C', 200, 50),
      label('R', 220, 50),
    ]

    const placements = layoutLabels(labels, { obstacles: [], bounds: VIEW })

    expect(placements.get('L')).toEqual(preferredPlacements(labels).get('L'))
    expect(anyOverlap(placedBoxes(labels, placements))).toBe(false)
  })

  it('never moves a fixed label, and moves the others off it', () => {
    const labels = [
      label('chip', 200, 80, { direction: { x: 0, y: 0 }, fixed: true }),
      label('Ltm', 200, 50),
    ]

    const placements = layoutLabels(labels, { obstacles: [], bounds: VIEW })

    expect(placements.get('chip')).toEqual({
      offset: { x: 0, y: 0 },
      compact: false,
    })
    expect(anyOverlap(placedBoxes(labels, placements))).toBe(false)
  })

  it('places fixed labels first, whatever their order', () => {
    const labels = [
      label('Ltm', 200, 50),
      label('chip', 200, 80, { direction: { x: 0, y: 0 }, fixed: true }),
    ]

    const placements = layoutLabels(labels, { obstacles: [], bounds: VIEW })

    expect(placements.get('chip')?.offset).toEqual({ x: 0, y: 0 })
    expect(anyOverlap(placedBoxes(labels, placements))).toBe(false)
  })

  it('keeps labels off obstacles such as markers and the front wall line', () => {
    const marker = { left: 190, top: 70, right: 210, bottom: 90 }
    const labels = [label('Recommended', 200, 50)]

    const placements = layoutLabels(labels, {
      obstacles: [marker],
      bounds: VIEW,
    })

    expect(
      placedBoxes(labels, placements).some((box) => boxesOverlap(box, marker)),
    ).toBe(false)
  })

  it('keeps labels inside the view', () => {
    const labels = [label('Ls', 200, 290)]

    const boxes = placedBoxes(
      labels,
      layoutLabels(labels, { obstacles: [], bounds: VIEW }),
    )

    expect(boxes.every((box) => box.bottom <= VIEW.bottom)).toBe(true)
  })

  it('stays close to its anchor rather than jumping across the view', () => {
    const labels = [label('L', 180, 50), label('C', 200, 50)]

    const offset = layoutLabels(labels, { obstacles: [], bounds: VIEW }).get(
      'C',
    )?.offset

    expect(Math.hypot(offset?.x ?? 0, offset?.y ?? 0)).toBeLessThan(80)
  })

  it('drops the secondary text (compact) when there is no room for the full label', () => {
    // A 40x30 label boxed in by obstacles leaving only a 40x16 slot below.
    const one = label('C', 200, 100, {
      compactSize: { width: 40, height: 15 },
      gap: 2,
    })
    const wall = (left: number, top: number, right: number, bottom: number) =>
      ({ left, top, right, bottom }) satisfies ScreenBox
    const obstacles = [
      wall(0, 0, 400, 100), // above the anchor
      wall(0, 118, 400, 300), // below the slot
      wall(0, 100, 180, 118), // left of the slot
      wall(220, 100, 400, 118), // right of the slot
    ]

    const placement = layoutLabels([one], { obstacles, bounds: VIEW }).get('C')

    expect(placement?.compact).toBe(true)
    const box = labelBox(one, placement!)
    expect(obstacles.some((o) => boxesOverlap(box, o))).toBe(false)
  })

  it('keeps the full text when the label fits', () => {
    const one = label('C', 200, 100, {
      compactSize: { width: 40, height: 15 },
    })

    expect(
      layoutLabels([one], { obstacles: [], bounds: VIEW }).get('C')?.compact,
    ).toBe(false)
  })

  it('rather covers an obstacle than another label when it must cover one', () => {
    const labels = [
      label('A', 200, 100, { direction: { x: 0, y: 0 }, fixed: true }),
      label('B', 200, 100, { direction: { x: 0, y: 0 } }),
    ]
    // An obstacle covers the whole view, so B can't be free.
    const obstacles = [{ left: -1000, top: -1000, right: 1000, bottom: 1000 }]

    const placements = layoutLabels(labels, { obstacles, bounds: VIEW })

    expect(anyOverlap(placedBoxes(labels, placements))).toBe(false)
  })

  it('still places every label, as clear as it can, when nothing is free', () => {
    const labels = [label('A', 200, 100), label('B', 200, 100)]
    const everywhere = { left: -1000, top: -1000, right: 1000, bottom: 1000 }

    const placements = layoutLabels(labels, {
      obstacles: [everywhere],
      bounds: VIEW,
    })

    expect(placements.size).toBe(2)
  })

  it('separates a crowded row of labels with grades', () => {
    // L, C and R 25 px apart under a front wall, with Sub1 among them.
    const speaker = (id: string, x: number) =>
      label(id, x, 40, {
        size: { width: 42, height: 30 },
        compactSize: { width: 42, height: 15 },
        gap: 14,
      })
    const labels = [
      label('Recommended', 200, 30, {
        size: { width: 94, height: 16 },
        direction: { x: 0, y: -1 },
        gap: 16,
      }),
      label('Sub1', 200, 8, {
        size: { width: 36, height: 16 },
        direction: { x: 1, y: 0 },
      }),
      speaker('L', 175),
      speaker('C', 200),
      speaker('R', 225),
    ]

    const placements = layoutLabels(labels, {
      obstacles: [{ left: 0, top: 0, right: 400, bottom: 3 }],
      bounds: VIEW,
    })

    expect(placements.size).toBe(labels.length)
    expect(anyOverlap(placedBoxes(labels, placements))).toBe(false)
  })
})
