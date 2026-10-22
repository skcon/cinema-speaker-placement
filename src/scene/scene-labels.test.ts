import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  itemDistances,
  recommendSeat,
  type Config,
  type PlaceableId,
} from '@/domain'
import { selectionDimensions } from '@/scene/dimensions'
import { boxesOverlap, labelBox, type ScreenBox } from '@/scene/label-layout'
import { roomObjectDrawings } from '@/scene/room-objects'
import {
  estimateLabelSize,
  estimateTextWidth,
  LABEL_METRICS,
  labelObstacles,
  layoutTopDownLabels,
  preferredSceneLabelPlacements,
  sceneLabels,
  topDownScreenPoint,
  type SceneLabel,
} from '@/scene/scene-labels'
import { topDownCamera, type ViewportSize } from '@/scene/top-down'

/** The 4x6 m room of issue #124: 4 m long, 6 m wide. */
const WIDE_ROOM: Config = {
  ...DEFAULT_CONFIG,
  room: { ...DEFAULT_CONFIG.room, length: 4, width: 6 },
}

/** The room view's canvas on a 390x844 phone and on a 1440x900 desktop. */
const PHONE: ViewportSize = { width: 326, height: 384 }
const DESKTOP: ViewportSize = { width: 1086, height: 330 }

function labelsFor(config: Config, selected: PlaceableId | null = null) {
  const analysis = analyzeRoom(config)
  const item = selected ? analysis.items.get(selected) : undefined
  const selection = item
    ? selectionDimensions(
        {
          id: item.id,
          position: item.position,
          distances: itemDistances(config.room, item.position, analysis.mlp),
        },
        config.units,
      )
    : null
  const recommendedSeat = recommendSeat(config).recommended.position
  const labels = sceneLabels({
    room: config.room,
    units: config.units,
    items: analysis.items,
    roomObjects: roomObjectDrawings(
      {
        room: config.room,
        roomObjects: config.roomObjects,
        seatRow: analysis.seatRow,
      },
      'top-down',
    ),
    recommendedSeat,
    selection,
  })
  return { analysis, labels, recommendedSeat }
}

/** Each label's box once laid out in the top-down view. */
function laidOutBoxes(
  config: Config,
  viewport: ViewportSize,
  selected: PlaceableId | null = null,
): { label: SceneLabel; box: ScreenBox }[] {
  const { analysis, labels } = labelsFor(config, selected)
  const placements = layoutTopDownLabels(labels, {
    room: config.room,
    viewport,
    items: analysis.items,
  })
  return labels.map((label) => {
    const placement = placements.get(label.id)
    if (!placement) throw new Error(`${label.id} not placed`)
    const box = labelBox(
      {
        id: label.id,
        anchor: topDownScreenPoint(config.room, viewport, label.at),
        ...estimateLabelSize(label),
        direction: label.direction,
        gap: label.gap,
      },
      placement,
    )
    return { label, box }
  })
}

function collisions(boxes: { label: SceneLabel; box: ScreenBox }[]): string[] {
  return boxes.flatMap((a, i) =>
    boxes
      .slice(i + 1)
      .filter((b) => boxesOverlap(a.box, b.box))
      .map((b) => `${a.label.text} x ${b.label.text}`),
  )
}

describe('scene labels', () => {
  it('name the walls, the MLP, the recommended seat, every speaker and subwoofer', () => {
    const { labels, analysis } = labelsFor(DEFAULT_CONFIG)

    const texts = labels.map((label) => label.text)

    expect(texts).toEqual(
      expect.arrayContaining([
        'Front wall',
        '← 4.5 m →',
        '← 6 m →',
        'MLP',
        'Recommended',
        'L 26°',
        'Sub1',
      ]),
    )
    // One label per placed item, plus the walls and the recommended seat.
    expect(labels.filter((label) => label.id.startsWith('item-'))).toHaveLength(
      analysis.items.size,
    )
  })

  it('give speakers their grade as a detail line, and nothing else one', () => {
    const { labels } = labelsFor(DEFAULT_CONFIG)

    for (const label of labels) {
      expect(label.detail !== undefined).toBe(label.kind === 'speaker')
    }
    expect(labels.find((label) => label.text === 'L 26°')?.detail).toBe('ideal')
  })

  it('fix the wall labels in place and put them first', () => {
    const { labels } = labelsFor(DEFAULT_CONFIG)

    expect(labels.slice(0, 3).map((label) => label.fixed)).toEqual([
      true,
      true,
      true,
    ])
    expect(labels.slice(3).every((label) => !label.fixed)).toBe(true)
  })

  it("put the Selected item's distances before the item labels", () => {
    const { labels } = labelsFor(DEFAULT_CONFIG, 'Ltm')

    const kinds = labels.map((label) => label.kind)

    expect(kinds.filter((kind) => kind === 'distance').length).toBeGreaterThan(
      0,
    )
    expect(kinds.lastIndexOf('distance')).toBeLessThan(kinds.indexOf('mlp'))
  })
})

describe('estimated label sizes', () => {
  const label = (overrides: Partial<SceneLabel>): SceneLabel => ({
    id: 'x',
    kind: 'roomObject',
    at: { x: 0, y: 0, z: 0 },
    text: 'Sofa',
    direction: { x: 0, y: 0 },
    gap: 0,
    fixed: false,
    turned: false,
    ...overrides,
  })
  const { lineHeight, tightLineHeight, paddingX, border } = LABEL_METRICS

  it('grow with the text, one line high, padded at the sides', () => {
    expect(estimateLabelSize(label({ text: 'Sofa' }))).toEqual({
      size: {
        width: estimateTextWidth('Sofa', false) + 2 * paddingX,
        height: lineHeight,
      },
    })
  })

  it('are two lines high with a detail line, and one line compact', () => {
    const { size, compactSize } = estimateLabelSize(
      label({ kind: 'speaker', text: 'L 26°', detail: 'acceptable' }),
    )

    expect(size).toEqual({
      width: estimateTextWidth('acceptable', false) + 2 * paddingX,
      height: 2 * tightLineHeight,
    })
    expect(compactSize).toEqual({
      width: estimateTextWidth('L 26°', true) + 2 * paddingX,
      height: tightLineHeight,
    })
  })

  it('count the border around a distance', () => {
    expect(
      estimateLabelSize(label({ kind: 'distance', text: '2.25 m' })).size,
    ).toEqual({
      width: estimateTextWidth('2.25 m', true) + 2 * paddingX + 2 * border,
      height: lineHeight + 2 * border,
    })
  })

  it('turn with a turned label', () => {
    const { size } = estimateLabelSize(label({ text: 'ab', turned: true }))

    expect(size).toEqual({
      width: lineHeight,
      height: estimateTextWidth('ab', false) + 2 * paddingX,
    })
  })
})

describe('estimated text widths', () => {
  // Widths of the room view's labels as Chromium draws them (text-xs, the
  // system UI font), padding taken off.
  const measured = [
    ['Front wall', false, 55],
    ['\u2190 4.5 m \u2192', false, 61],
    ['Recommended', true, 86],
    ['MLP', true, 25],
    ['L 26°', true, 30],
    ['ideal', false, 27],
    ['Ltm 83°', true, 45],
  ] as const

  for (const [text, medium, width] of measured) {
    it(`come within 4 px of "${text}" as drawn`, () => {
      expect(Math.abs(estimateTextWidth(text, medium) - width)).toBeLessThan(4)
    })
  }

  it('are wider in medium weight', () => {
    expect(estimateTextWidth('Sub1', true)).toBeGreaterThan(
      estimateTextWidth('Sub1', false),
    )
  })
})

describe('the top-down screen projection', () => {
  const room = WIDE_ROOM.room

  it('puts the room center at the middle of the view', () => {
    expect(topDownScreenPoint(room, PHONE, { x: 0, y: 2 })).toEqual({
      x: 163,
      y: 192,
    })
  })

  it('scales by the camera zoom, the front wall at the top', () => {
    const { zoom } = topDownCamera(room, PHONE)

    const front = topDownScreenPoint(room, PHONE, { x: 1, y: 0 })

    expect(front.x).toBeCloseTo(163 + zoom, 9)
    expect(front.y).toBeCloseTo(192 - 2 * zoom, 9)
  })
})

describe('label obstacles', () => {
  it('cover every marker and the front wall line', () => {
    const { analysis } = labelsFor(DEFAULT_CONFIG)

    const obstacles = labelObstacles(DEFAULT_CONFIG.room, PHONE, analysis.items)

    expect(obstacles).toHaveLength(analysis.items.size + 1)
    const mlp = topDownScreenPoint(DEFAULT_CONFIG.room, PHONE, analysis.mlp)
    expect(
      obstacles.some(
        (box) =>
          box.left < mlp.x &&
          mlp.x < box.right &&
          box.top < mlp.y &&
          mlp.y < box.bottom,
      ),
    ).toBe(true)
  })
})

describe('laid-out scene labels (issue #124)', () => {
  for (const [name, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    it(`never overlap in the 4x6 m room on a ${name}`, () => {
      expect(collisions(laidOutBoxes(WIDE_ROOM, viewport))).toEqual([])
    })

    it(`never overlap in the default room on a ${name}`, () => {
      expect(collisions(laidOutBoxes(DEFAULT_CONFIG, viewport))).toEqual([])
    })

    it(`keep the Selected item's distances clear of the other labels on a ${name}`, () => {
      expect(collisions(laidOutBoxes(DEFAULT_CONFIG, viewport, 'Ltm'))).toEqual(
        [],
      )
    })
  }

  it('keep the Recommended label off the front wall line and Sub1', () => {
    const boxes = laidOutBoxes(WIDE_ROOM, PHONE)
    const recommended = boxes.find((b) => b.label.kind === 'recommended')!.box
    const frontWallY = topDownScreenPoint(WIDE_ROOM.room, PHONE, {
      x: 0,
      y: 0,
    }).y

    expect(
      recommended.top > frontWallY || recommended.bottom < frontWallY,
    ).toBe(true)
  })

  it('leave labels at their preferred place in the 3D view', () => {
    const { labels } = labelsFor(DEFAULT_CONFIG)

    const placements = preferredSceneLabelPlacements(labels)

    expect(placements.get('item-MLP')).toEqual({
      offset: { x: 0, y: LABEL_METRICS.lineHeight / 2 + 12 },
      compact: false,
    })
  })
})
