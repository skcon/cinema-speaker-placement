import {
  type PlaceableId,
  type PlacedItem,
  type Room,
  type RoomPoint,
  type UnitSystem,
} from '@/domain'
import { roomDimensions, type SelectionDimensions } from '@/scene/dimensions'
import {
  LABEL_MARGIN_PX,
  layoutLabels,
  preferredPlacements,
  type LabelPlacement,
  type LabelSize,
  type LabelToPlace,
  type ScreenBox,
  type ScreenPoint,
} from '@/scene/label-layout'
import type { RoomObjectDrawing } from '@/scene/room-objects'
import {
  GRADE_STYLES,
  itemsInDrawOrder,
  MLP_MARKER_RADIUS,
  OVERHEAD_MARKER_RADIUS,
  overheadMarker,
  SPEAKER_FOOTPRINT,
  speakerMarker,
  SUBWOOFER_FOOTPRINT,
  subwooferMarker,
  type ScreenDirection,
} from '@/scene/speakers'
import { topDownCamera, type ViewportSize } from '@/scene/top-down'

/**
 * Every text label the room view draws over the scene, where it is pinned
 * and which way it would like to sit, and how to lay them out so they don't
 * run into each other (see layoutLabels).
 */

/** What a scene label names; the room view styles each kind its own way. */
export type SceneLabelKind =
  | 'frontWall'
  | 'roomWidth'
  | 'roomLength'
  | 'distance'
  | 'mlp'
  | 'recommended'
  | 'speaker'
  | 'subwoofer'
  | 'roomObject'

/** One text label in the room view. */
export type SceneLabel = {
  readonly id: string
  readonly kind: SceneLabelKind
  /** The room point it is pinned to. */
  readonly at: RoomPoint
  readonly text: string
  /**
   * A second, muted line (a speaker's grade), dropped first when the label
   * has no room: the grade is also the marker's color and in the room
   * view's description.
   */
  readonly detail?: string
  /** Which way it would like to sit off its point (0, 0 for centered on it). */
  readonly direction: ScreenDirection
  /** Free space between its point and its near edge, in pixels. */
  readonly gap: number
  /** Always at its preferred place: the others keep clear of it. */
  readonly fixed: boolean
  /** Turned a quarter turn, to run along a side wall. */
  readonly turned: boolean
}

/** Free space between a marker's center and its label, in pixels. */
const MARKER_LABEL_GAP_PX = 14

/** Free space between a wall and the label written along it, in pixels. */
const WALL_LABEL_GAP_PX = 6

/** Free space between the MLP's center and its label (below it), in pixels. */
const MLP_LABEL_GAP_PX = 12

/** Free space between the recommended seat and its label (above it), in pixels. */
const RECOMMENDED_LABEL_GAP_PX = 16

/**
 * Estimated label metrics for the scene labels (`text-xs`, the system UI
 * font), in pixels: the font size, the line height of a one-line and of a
 * two-line label (`leading-tight`), the label's side padding and the
 * distance chips' border. Our own drawing values, not a spec.
 */
export const LABEL_METRICS = {
  fontSize: 12,
  lineHeight: 16,
  tightLineHeight: 15,
  paddingX: 4,
  border: 1,
} as const

/**
 * Rough character widths in the system UI sans-serif fonts, as a share of
 * the font size, and how much wider medium weight is: our own estimate,
 * checked against the room view's labels in Chromium (within a few
 * pixels). The label layout keeps LABEL_MARGIN_PX of air for the rest.
 */
const CHAR_WIDTHS = {
  narrow: { chars: "fijlrtI .,:°'", em: 0.3 },
  wide: { chars: 'mwMW←→', em: 0.9 },
  digit: { em: 0.58 },
  upper: { em: 0.68 },
  other: { em: 0.55 },
  medium: 1.04,
} as const

/** The kinds written in medium weight (the first line of speaker labels too). */
const MEDIUM_KINDS: ReadonlySet<SceneLabelKind> = new Set([
  'distance',
  'mlp',
  'recommended',
  'speaker',
  'subwoofer',
])

/** Half the width of the front wall's drawn line, in pixels, plus some air. */
const FRONT_WALL_HALF_WIDTH_PX = 3

/**
 * The room view's labels, most important first (the order layoutLabels
 * places them in): the walls' labels, fixed; the Selected item's distances;
 * the MLP; the speakers and overheads, then the subwoofers; the
 * recommended seat (its violet ring is also in the legend, so it gives way
 * to the speakers crowding a small room); then the room objects' names.
 */
export function sceneLabels({
  room,
  units,
  items,
  roomObjects,
  recommendedSeat,
  selection,
}: {
  room: Room
  units: UnitSystem
  items: ReadonlyMap<PlaceableId, PlacedItem>
  /** The room objects as the view draws them; their `label` shapes are named. */
  roomObjects: readonly RoomObjectDrawing[]
  recommendedSeat: RoomPoint | null
  selection: SelectionDimensions | null
}): SceneLabel[] {
  const [width, length] = roomDimensions(room, units)
  const base = { fixed: false, turned: false } as const
  const walls: SceneLabel[] = [
    {
      ...base,
      id: 'front-wall',
      kind: 'frontWall',
      // Room coordinates start at the middle of the front wall.
      at: { x: 0, y: 0, z: 0 },
      text: 'Front wall',
      direction: { x: 0, y: -1 },
      gap: WALL_LABEL_GAP_PX,
      fixed: true,
    },
    {
      ...base,
      id: 'room-width',
      kind: 'roomWidth',
      at: width.at,
      text: `← ${width.text} →`,
      direction: { x: 0, y: 1 },
      gap: WALL_LABEL_GAP_PX,
      fixed: true,
    },
    {
      ...base,
      id: 'room-length',
      kind: 'roomLength',
      at: length.at,
      text: `← ${length.text} →`,
      direction: { x: -1, y: 0 },
      gap: WALL_LABEL_GAP_PX,
      fixed: true,
      turned: true,
    },
  ]
  const distances: SceneLabel[] = (selection?.lines ?? []).map((line) => ({
    ...base,
    id: `distance-${line.target}`,
    kind: 'distance',
    at: line.labelAt,
    text: line.text,
    direction: { x: 0, y: 0 },
    gap: 0,
  }))
  const ordered = itemsInDrawOrder(items)
  const mlp: SceneLabel[] = ordered
    .filter((item) => item.kind === 'mlp')
    .map((item) => ({
      ...base,
      id: `item-${item.id}`,
      kind: 'mlp',
      at: item.position,
      text: 'MLP',
      direction: { x: 0, y: 1 },
      gap: MLP_LABEL_GAP_PX,
    }))
  const recommended: SceneLabel[] = recommendedSeat
    ? [
        {
          ...base,
          id: 'recommended',
          kind: 'recommended',
          at: recommendedSeat,
          text: 'Recommended',
          direction: { x: 0, y: -1 },
          gap: RECOMMENDED_LABEL_GAP_PX,
        },
      ]
    : []
  const markers = ordered.flatMap((item): SceneLabel[] => {
    const marker = { ...base, id: `item-${item.id}`, at: item.position }
    switch (item.kind) {
      case 'mlp':
        return []
      case 'listenerLevel': {
        const { label, grade, labelDirection } = speakerMarker(item)
        return [
          {
            ...marker,
            kind: 'speaker',
            text: label,
            detail: GRADE_STYLES[grade].label,
            direction: labelDirection,
            gap: MARKER_LABEL_GAP_PX,
          },
        ]
      }
      case 'overhead': {
        const { label, grade, labelDirection } = overheadMarker(item)
        return [
          {
            ...marker,
            kind: 'speaker',
            text: label,
            detail: GRADE_STYLES[grade].label,
            direction: labelDirection,
            gap: MARKER_LABEL_GAP_PX,
          },
        ]
      }
      case 'subwoofer': {
        const { label, labelDirection } = subwooferMarker(item)
        return [
          {
            ...marker,
            kind: 'subwoofer',
            text: label,
            direction: labelDirection,
            gap: MARKER_LABEL_GAP_PX,
          },
        ]
      }
    }
  })
  // Subwoofers draw before the speakers but give way to their labels.
  const byKind = (kind: SceneLabelKind) =>
    markers.filter((label) => label.kind === kind)
  const objects: SceneLabel[] = roomObjects.flatMap(({ id, shapes }) =>
    shapes.flatMap((shape, index): SceneLabel[] =>
      shape.kind === 'label'
        ? [
            {
              ...base,
              id: `object-${id}-${index}`,
              kind: 'roomObject',
              at: shape.at,
              text: shape.text,
              direction: { x: 0, y: 0 },
              gap: 0,
            },
          ]
        : [],
    ),
  )
  return [
    ...walls,
    ...distances,
    ...mlp,
    ...byKind('speaker'),
    ...byKind('subwoofer'),
    ...recommended,
    ...objects,
  ]
}

/** The estimated width of `text` in a scene label, in pixels (see CHAR_WIDTHS). */
export function estimateTextWidth(text: string, medium: boolean): number {
  const { narrow, wide, digit, upper, other } = CHAR_WIDTHS
  const em = [...text].reduce((sum, char) => {
    if (narrow.chars.includes(char)) return sum + narrow.em
    if (wide.chars.includes(char)) return sum + wide.em
    if (/\d/.test(char)) return sum + digit.em
    if (/[A-Z]/.test(char)) return sum + upper.em
    return sum + other.em
  }, 0)
  return em * LABEL_METRICS.fontSize * (medium ? CHAR_WIDTHS.medium : 1)
}

/**
 * A label's estimated size on screen, and its compact size (without its
 * detail line) if it has one (see LABEL_METRICS). A turned label's box is
 * turned too.
 */
export function estimateLabelSize({ kind, text, detail, turned }: SceneLabel): {
  size: LabelSize
  compactSize?: LabelSize
} {
  const { lineHeight, tightLineHeight, paddingX, border } = LABEL_METRICS
  const edges = kind === 'distance' ? 2 * border : 0
  const textWidth = estimateTextWidth(text, MEDIUM_KINDS.has(kind))
  const box = (width: number, height: number): LabelSize => {
    const outer = {
      width: width + 2 * paddingX + edges,
      height: height + edges,
    }
    return turned ? { width: outer.height, height: outer.width } : outer
  }
  if (detail === undefined) {
    return { size: box(textWidth, lineHeight) }
  }
  const detailWidth = estimateTextWidth(detail, false)
  return {
    size: box(Math.max(textWidth, detailWidth), 2 * tightLineHeight),
    compactSize: box(textWidth, tightLineHeight),
  }
}

/**
 * Where a room point shows in the top-down view of `room` filling
 * `viewport` (see topDownCamera), in pixels from its top-left corner.
 */
export function topDownScreenPoint(
  room: Room,
  viewport: ViewportSize,
  { x, y }: { x: number; y: number },
): ScreenPoint {
  const { zoom } = topDownCamera(room, viewport)
  return {
    x: viewport.width / 2 + x * zoom,
    y: viewport.height / 2 + (y - room.length / 2) * zoom,
  }
}

/**
 * What labels must keep clear of, on the floor plan: each item's marker,
 * as a square around its center (half its drawn size, in meters), and the
 * front wall's line. The recommended seat's ring is thin and may be
 * crossed: in a small room it rings the front speakers, whose labels have
 * nowhere else to go.
 */
export function labelObstacles(
  room: Room,
  viewport: ViewportSize,
  items: ReadonlyMap<PlaceableId, PlacedItem>,
): ScreenBox[] {
  const { zoom } = topDownCamera(room, viewport)
  const square = (at: RoomPoint, half: number): ScreenBox => {
    const center = topDownScreenPoint(room, viewport, at)
    const px = half * zoom
    return {
      left: center.x - px,
      top: center.y - px,
      right: center.x + px,
      bottom: center.y + px,
    }
  }
  const markers = [...items.values()].map((item) =>
    square(item.position, markerHalfSize(item)),
  )
  const left = topDownScreenPoint(room, viewport, { x: -room.width / 2, y: 0 })
  const right = topDownScreenPoint(room, viewport, { x: room.width / 2, y: 0 })
  const frontWall: ScreenBox = {
    left: left.x,
    top: left.y - FRONT_WALL_HALF_WIDTH_PX,
    right: right.x,
    bottom: right.y + FRONT_WALL_HALF_WIDTH_PX,
  }
  return [...markers, frontWall]
}

/** Half the drawn size of an item's marker, in meters (its largest extent). */
function markerHalfSize(item: PlacedItem): number {
  switch (item.kind) {
    case 'mlp':
      return MLP_MARKER_RADIUS
    case 'listenerLevel':
      return Math.max(SPEAKER_FOOTPRINT.width, SPEAKER_FOOTPRINT.depth) / 2
    case 'overhead':
      return OVERHEAD_MARKER_RADIUS
    case 'subwoofer':
      return SUBWOOFER_FOOTPRINT / 2
  }
}

/** A scene label as layoutLabels takes it, pinned to `anchor`. */
function toPlace(label: SceneLabel, anchor: ScreenPoint): LabelToPlace {
  return {
    id: label.id,
    anchor,
    ...estimateLabelSize(label),
    direction: label.direction,
    gap: label.gap,
    fixed: label.fixed,
  }
}

/**
 * Where each label goes in the top-down view of `room` filling `viewport`:
 * clear of the other labels, the markers and the front wall line, inside
 * the view (see layoutLabels).
 */
export function layoutTopDownLabels(
  labels: readonly SceneLabel[],
  {
    room,
    viewport,
    items,
  }: {
    room: Room
    viewport: ViewportSize
    items: ReadonlyMap<PlaceableId, PlacedItem>
  },
): Map<string, LabelPlacement> {
  return layoutLabels(
    labels.map((label) =>
      toPlace(label, topDownScreenPoint(room, viewport, label.at)),
    ),
    {
      obstacles: labelObstacles(room, viewport, items),
      bounds: {
        left: LABEL_MARGIN_PX,
        top: LABEL_MARGIN_PX,
        right: viewport.width - LABEL_MARGIN_PX,
        bottom: viewport.height - LABEL_MARGIN_PX,
      },
    },
  )
}

/**
 * Every label at its preferred place: for the 3D view, which turns under
 * the labels, so they aren't laid out.
 */
export function preferredSceneLabelPlacements(
  labels: readonly SceneLabel[],
): Map<string, LabelPlacement> {
  return preferredPlacements(
    labels.map((label) => toPlace(label, { x: 0, y: 0 })),
  )
}
