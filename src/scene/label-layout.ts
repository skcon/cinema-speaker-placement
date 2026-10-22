/**
 * Pure label layout for the room view: given where each label is pinned
 * (its anchor on screen), its estimated size and which way it would like to
 * sit off its anchor, picks an offset for every label so no two overlap and
 * none covers an obstacle (a marker, the front wall line), staying inside the
 * view. A label that has secondary text (a speaker's grade) may drop it, to
 * its compact size, when there is no room for the full label. Screen pixels
 * throughout: x to the right, y down.
 */

/** A point on screen, in pixels: x to the right, y down. */
export type ScreenPoint = { readonly x: number; readonly y: number }

/** A screen direction: each part -1, 0 or 1 (0, 0 for centered on the anchor). */
export type LabelDirection = { readonly x: number; readonly y: number }

/** A label's size on screen, in pixels. */
export type LabelSize = { readonly width: number; readonly height: number }

/** An axis-aligned box on screen, in pixels. */
export type ScreenBox = {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/** One label for layoutLabels. */
export type LabelToPlace = {
  readonly id: string
  /** The screen point it is pinned to (its item, wall or line). */
  readonly anchor: ScreenPoint
  /** Its estimated size with all its text. */
  readonly size: LabelSize
  /** Its estimated size without its secondary text, if it has any to drop. */
  readonly compactSize?: LabelSize
  /** Which way it would like to sit off its anchor. */
  readonly direction: LabelDirection
  /** Free space between the anchor and the label's near edge, in pixels. */
  readonly gap: number
  /**
   * Drawn at its preferred place, never moved, and placed before the
   * others, which keep clear of it.
   */
  readonly fixed?: boolean
}

/** Where a label goes: its center's offset from its anchor, and whether it is compact. */
export type LabelPlacement = {
  readonly offset: ScreenPoint
  /** Drawn without its secondary text. */
  readonly compact: boolean
}

/**
 * Free space kept between a label and anything it must not touch, in
 * pixels, which also absorbs small errors in the estimated sizes.
 */
export const LABEL_MARGIN_PX = 2

/** How much further out each ring of candidate places is than the last, in pixels. */
const RING_STEP_PX = 6

/**
 * How many rings of candidate places a label tries. With RING_STEP_PX this
 * keeps a label within about 25 px of its anchor beyond its gap, so it
 * still reads as its item's.
 */
const RINGS = 5

/** How far apart candidate places are along a ring, at most, in pixels. */
const SLIDE_STEP_PX = 4

/**
 * What dropping a label's secondary text counts as, in pixels moved: a
 * label rather drops it than moves this much further from its preferred
 * place.
 */
const COMPACT_COST_PX = 16

/** Whether two boxes share any area (touching edges don't). */
export function boxesOverlap(a: ScreenBox, b: ScreenBox): boolean {
  return overlapArea(a, b) > 0
}

/** The box a label covers when placed as `placement`. */
export function labelBox(
  { anchor, size, compactSize }: LabelToPlace,
  { offset, compact }: LabelPlacement,
): ScreenBox {
  const { width, height } = (compact && compactSize) || size
  const x = anchor.x + offset.x
  const y = anchor.y + offset.y
  return {
    left: x - width / 2,
    top: y - height / 2,
    right: x + width / 2,
    bottom: y + height / 2,
  }
}

/**
 * Every label at its preferred place, with all its text: off its anchor
 * along its direction by half its size plus its gap. Where the labels go
 * when they aren't laid out (the 3D view, which turns under them).
 */
export function preferredPlacements(
  labels: readonly LabelToPlace[],
): Map<string, LabelPlacement> {
  return new Map(
    labels.map((label) => [label.id, preferredPlacement(label)] as const),
  )
}

function preferredPlacement(label: LabelToPlace): LabelPlacement {
  return {
    offset: offsetAlong(label.direction, label.size, label.gap),
    compact: false,
  }
}

/**
 * A placement for every label, by id, so no two overlap and none covers an
 * `obstacle` or leaves `bounds`, where that can be done. Fixed labels go
 * first, at their preferred place; then the others in the order given (most
 * important first), each at the first free candidate place nearest its
 * preferred one, with its full text if it fits anywhere nearby, else
 * compact. A label with no free place nearby takes the one that overlaps
 * least.
 */
export function layoutLabels(
  labels: readonly LabelToPlace[],
  { obstacles, bounds }: { obstacles: readonly ScreenBox[]; bounds: ScreenBox },
): Map<string, LabelPlacement> {
  const placements = new Map<string, LabelPlacement>()
  const taken: ScreenBox[] = []
  const fixed = labels.filter((label) => label.fixed)
  const movable = labels.filter((label) => !label.fixed)
  for (const label of fixed) {
    const placement = preferredPlacement(label)
    placements.set(label.id, placement)
    taken.push(labelBox(label, placement))
  }
  for (const label of movable) {
    const placement = bestPlacement(label, { taken, obstacles, bounds })
    placements.set(label.id, placement)
    taken.push(labelBox(label, placement))
  }
  return placements
}

/** What a label must keep clear of: placed labels, obstacles and the view's edges. */
type Surroundings = {
  taken: readonly ScreenBox[]
  obstacles: readonly ScreenBox[]
  bounds: ScreenBox
}

function bestPlacement(
  label: LabelToPlace,
  surroundings: Surroundings,
): LabelPlacement {
  let best: LabelPlacement | null = null
  let bestCost = Infinity
  for (const placement of candidatePlacements(label)) {
    const cost = placementCost(labelBox(label, placement), surroundings)
    if (cost === 0) return placement
    if (cost < bestCost) {
      best = placement
      bestCost = cost
    }
  }
  return best ?? preferredPlacement(label)
}

/**
 * The places a label may go, best first: all around its anchor, ring by
 * ring further out, nearest its preferred place first, with dropping its
 * secondary text (compact, if it has any) counted as COMPACT_COST_PX of
 * moving. A centered label may also stay centered.
 */
function candidatePlacements(label: LabelToPlace): LabelPlacement[] {
  const preferred = offsetAlong(label.direction, label.size, label.gap)
  const centered = label.direction.x === 0 && label.direction.y === 0
  const sizes: [LabelSize, boolean][] = [[label.size, false]]
  if (label.compactSize) sizes.push([label.compactSize, true])
  const scored = sizes.flatMap(([size, compact]) => {
    const offsets = Array.from({ length: RINGS }, (_, ring) =>
      aroundAnchor(size, label.gap + ring * RING_STEP_PX),
    ).flat()
    if (centered) offsets.unshift({ x: 0, y: 0 })
    return offsets.map((offset) => ({
      placement: { offset, compact },
      cost:
        Math.hypot(offset.x - preferred.x, offset.y - preferred.y) +
        (compact ? COMPACT_COST_PX : 0),
    }))
  })
  // Array.prototype.sort is stable: ties keep the nearer ring first.
  return scored
    .sort((a, b) => a.cost - b.cost)
    .map(({ placement }) => placement)
}

/**
 * The centers of a `size` label placed all around its anchor, `gap` clear
 * of it on the near side: along each side of the rectangle they make,
 * corners and side middles included, at most SLIDE_STEP_PX apart.
 */
function aroundAnchor(size: LabelSize, gap: number): ScreenPoint[] {
  const halfX = size.width / 2 + gap
  const halfY = size.height / 2 + gap
  const across = (half: number) => {
    const steps = Math.max(1, Math.ceil(half / SLIDE_STEP_PX))
    return Array.from(
      { length: 2 * steps + 1 },
      (_, i) => ((i - steps) * half) / steps,
    )
  }
  return [
    ...across(halfX).flatMap((x) => [
      { x, y: -halfY },
      { x, y: halfY },
    ]),
    ...across(halfY).flatMap((y) => [
      { x: -halfX, y },
      { x: halfX, y },
    ]),
  ]
}

/** The center of a `size` label sitting off its anchor along `direction`, `gap` clear of it. */
function offsetAlong(
  direction: LabelDirection,
  size: LabelSize,
  gap: number,
): ScreenPoint {
  return {
    x: direction.x * (size.width / 2 + gap),
    y: direction.y * (size.height / 2 + gap),
  }
}

/**
 * How much worse covering another label or leaving the view is than
 * covering an obstacle: a label partly over a marker still reads, two
 * labels over each other don't.
 */
const LABEL_OVERLAP_WEIGHT = 20

/**
 * How badly a label box sits: the area it shares with the placed labels
 * and the obstacles (with LABEL_MARGIN_PX around it) and its area outside
 * the view, weighted (LABEL_OVERLAP_WEIGHT); 0 when it is free.
 */
function placementCost(
  box: ScreenBox,
  { taken, obstacles, bounds }: Surroundings,
): number {
  const padded = inflate(box, LABEL_MARGIN_PX)
  const covered = (boxes: readonly ScreenBox[]) =>
    boxes.reduce((sum, other) => sum + overlapArea(padded, other), 0)
  const outside = area(box) - overlapArea(box, bounds)
  return LABEL_OVERLAP_WEIGHT * (covered(taken) + outside) + covered(obstacles)
}

function inflate(box: ScreenBox, by: number): ScreenBox {
  return {
    left: box.left - by,
    top: box.top - by,
    right: box.right + by,
    bottom: box.bottom + by,
  }
}

function area(box: ScreenBox): number {
  return Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top)
}

function overlapArea(a: ScreenBox, b: ScreenBox): number {
  return area({
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  })
}
