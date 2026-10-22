/**
 * Grab areas: what a press on the top-down room view picks up. Every rule
 * about which drag target a press at a floor point picks lives here, so
 * the room view only turns the pointer into a floor point and asks
 * pressAt.
 *
 * Every drag target (see dragAnchors in the domain) has one grab area: its
 * anchor, the marker drawn for it and how far a press reaches it.
 *
 * - **Reach.** A press is on a target's grab area when it is on what is
 *   drawn for the target, or within a touch target of it at the view's
 *   zoom: an item's round marker reaches at least a touch target's radius
 *   from its center (grabRadius), and a room object's rectangle is at
 *   least a touch target long each way (grabLength).
 * - **Nearest marker.** Of the grab areas a press is on, the one whose
 *   marker is nearest the press picks it up, so a press on a marker picks
 *   that marker, even where another's touch target reaches over it (#91).
 * - **On top.** Where two markers are equally near (the press is on
 *   both), the one drawn on top wins: an item whose drawn marker is under
 *   the press (the higher one first: overheads on the ceiling over
 *   listener-level speakers over subwoofers), then an item only reached
 *   by its touch target, then a room object; and of those alike, the one
 *   first in grabAreas' order. Room objects equally near go to a
 *   furniture box first, then the Screen, the openings and the Seat row
 *   (drawn under everything): the room view used to leave that tie to
 *   Three.js hit order, which picked a furniture box over the Screen and,
 *   on most page loads, over the Seat row.
 *
 * Pure: no React, no Three.js. All lengths are in meters on the floor
 * plan.
 */
import {
  dragAnchors,
  type Config,
  type DragTarget,
  type FloorPoint,
  type PlacedItem,
  type RoomAnalysis,
  type RoomObjectKind,
} from '@/domain'
import { roomObjectGrabs, type GrabRectangle } from '@/scene/room-objects'
import {
  itemsInDrawOrder,
  MLP_MARKER_RADIUS,
  OVERHEAD_MARKER_DOT,
  OVERHEAD_MARKER_RADIUS,
  OVERHEAD_MARKER_RING_INNER,
  SPEAKER_FOOTPRINT,
  speakerFacing,
  SUBWOOFER_FOOTPRINT,
} from '@/scene/speakers'

/**
 * A marker as the nearest-marker rule measures it, in meters: an item's
 * round one (`radius`), or a room object's rectangle, `width` along x and
 * `depth` along y.
 */
export type GrabShape =
  { readonly center: FloorPoint; readonly radius: number } | GrabRectangle

/**
 * What is drawn for an item, where a press is on it: a disc (the MLP), a
 * ring with a center dot (an overhead), or a rectangle `width` across and
 * `depth` along `facing`, a unit vector (a speaker's cabinet turned the
 * way it aims, a subwoofer's square).
 */
type Drawn =
  | { readonly kind: 'disc'; readonly radius: number }
  | {
      readonly kind: 'ring'
      readonly inner: number
      readonly outer: number
      readonly dot: number
    }
  | {
      readonly kind: 'box'
      readonly width: number
      readonly depth: number
      readonly facing: FloorPoint
    }

/** A drag target's grab area (see the module comment). */
export type GrabArea = {
  readonly target: DragTarget
  /** The floor point a drag of the target moves (see dragAnchors). */
  readonly anchor: FloorPoint
  /** Its marker, which the nearest-marker rule measures to. */
  readonly marker: GrabShape
  /**
   * For an item, what is drawn for it and how high, in meters: a press on
   * it is on the grab area at any zoom, and a higher one is drawn on top.
   * Null for a room object, which is drawn as its marker, under every
   * item.
   */
  readonly item: { readonly drawn: Drawn; readonly height: number } | null
}

/** What grabAreas needs from the config's Room analysis (analyzeRoom). */
export type GrabAnalysis = Pick<RoomAnalysis, 'mlp' | 'items' | 'seatRow'>

/**
 * Where each kind of room object goes when ties between them go (see the
 * module comment), first to last: every kind has a place, so each one's
 * grab rectangle (roomObjectGrabs, the one it is drawn as from above) is
 * a grab area.
 */
const ROOM_OBJECT_TIES: { readonly [K in RoomObjectKind]: number } = {
  furniture: 0,
  screen: 1,
  opening: 2,
  seatRow: 3,
}

const ROOM_OBJECT_TIE_ORDER = (
  Object.keys(ROOM_OBJECT_TIES) as RoomObjectKind[]
).sort((a, b) => ROOM_OBJECT_TIES[a] - ROOM_OBJECT_TIES[b])

/**
 * The smallest touch target, in pixels: the size WCAG 2.5.5 (AAA) and the
 * Apple and Android guidelines give for something a finger has to hit.
 */
const TOUCH_TARGET_PX = 44

/**
 * The grab area of every drag target the config has, in the order ties
 * go (see the module comment): the furniture boxes, the Screen, the
 * openings, the Seat row, then the MLP, the subwoofers, the
 * listener-level speakers and the overheads, as the room view draws them.
 * Items are where `analysis` (the config's Room analysis) places them.
 */
export function grabAreas(
  config: Config,
  analysis: GrabAnalysis,
): readonly GrabArea[] {
  const anchors = dragAnchors(config, analysis)
  const areas: GrabArea[] = []
  const add = (
    target: DragTarget,
    marker: GrabShape,
    item: GrabArea['item'] = null,
  ) => {
    const anchor = anchors.get(target)
    if (anchor) areas.push({ target, anchor, marker, item })
  }

  const objects = {
    room: config.room,
    roomObjects: config.roomObjects,
    seatRow: analysis.seatRow,
  }
  for (const kind of ROOM_OBJECT_TIE_ORDER) {
    for (const { target, marker } of roomObjectGrabs(objects, kind)) {
      add(target, marker)
    }
  }

  for (const item of itemsInDrawOrder(analysis.items)) {
    const { radius, drawn } = itemMarker(item)
    add(
      item.id,
      { center: item.position, radius },
      { drawn, height: item.position.z },
    )
  }
  return areas
}

/**
 * An item's marker as the nearest-marker rule measures it (round, of
 * `radius`) and what is drawn for it, by its kind.
 */
function itemMarker(item: PlacedItem): { radius: number; drawn: Drawn } {
  switch (item.kind) {
    case 'mlp':
      return {
        radius: MLP_MARKER_RADIUS,
        drawn: { kind: 'disc', radius: MLP_MARKER_RADIUS },
      }
    case 'subwoofer':
      return {
        radius: SUBWOOFER_FOOTPRINT / 2,
        drawn: {
          kind: 'box',
          width: SUBWOOFER_FOOTPRINT,
          depth: SUBWOOFER_FOOTPRINT,
          facing: { x: 0, y: 1 },
        },
      }
    case 'listenerLevel':
      return {
        radius: SPEAKER_FOOTPRINT.width / 2,
        drawn: {
          kind: 'box',
          ...SPEAKER_FOOTPRINT,
          facing: speakerFacing(item.aim),
        },
      }
    case 'overhead':
      return {
        radius: OVERHEAD_MARKER_RADIUS,
        drawn: {
          kind: 'ring',
          inner: OVERHEAD_MARKER_RADIUS * OVERHEAD_MARKER_RING_INNER,
          outer: OVERHEAD_MARKER_RADIUS,
          dot: OVERHEAD_MARKER_RADIUS * OVERHEAD_MARKER_DOT,
        },
      }
  }
}

/**
 * The grab area a press at `point` on the floor plan picks up, with the
 * view at `zoom` pixels per meter, or null when the press is on none (see
 * the module comment for the rules). A drag of its target moves its
 * anchor.
 */
export function pressAt(
  areas: readonly GrabArea[],
  point: FloorPoint,
  zoom: number,
): GrabArea | null {
  const under = areas
    .flatMap((area, order) => {
      const stacking = stackingUnder(area, point, zoom)
      return stacking ? [{ area, order, ...stacking }] : []
    })
    .sort((a, b) => a.tier - b.tier || b.height - a.height || a.order - b.order)
  let picked: GrabArea | null = null
  let nearest = Infinity
  for (const { area } of under) {
    const distance = distanceToShape(area.marker, point)
    // Strictly nearer: of markers equally near, the one on top wins.
    if (distance < nearest) {
      picked = area
      nearest = distance
    }
  }
  return picked
}

/** Ties go to the lowest tier, then the highest height: the one drawn on top. */
const TIER = { drawnItem: 0, touchItem: 1, roomObject: 2 } as const

/**
 * Where `area` stacks among the grab areas a press at `point` is on, or
 * null when the press is not on it.
 */
function stackingUnder(
  { marker, item }: GrabArea,
  point: FloorPoint,
  zoom: number,
): { tier: number; height: number } | null {
  if (!item) {
    if (!('width' in marker)) return null
    const reach = {
      center: marker.center,
      width: grabLength(marker.width, zoom),
      depth: grabLength(marker.depth, zoom),
    }
    return distanceToShape(reach, point) === 0
      ? { tier: TIER.roomObject, height: 0 }
      : null
  }
  if (isOnDrawn(item.drawn, marker.center, point)) {
    return { tier: TIER.drawnItem, height: item.height }
  }
  if (!('radius' in marker)) return null
  const reach = {
    center: marker.center,
    radius: grabRadius(marker.radius, zoom),
  }
  return distanceToShape(reach, point) === 0
    ? { tier: TIER.touchItem, height: 0 }
    : null
}

/** Whether `point` is on `drawn`, drawn at `center`. */
function isOnDrawn(drawn: Drawn, center: FloorPoint, point: FloorPoint) {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const fromCenter = Math.hypot(dx, dy)
  switch (drawn.kind) {
    case 'disc':
      return fromCenter <= drawn.radius
    case 'ring':
      return (
        fromCenter <= drawn.dot ||
        (fromCenter >= drawn.inner && fromCenter <= drawn.outer)
      )
    case 'box': {
      const { facing } = drawn
      const along = dx * facing.x + dy * facing.y
      const across = dx * facing.y - dy * facing.x
      return (
        Math.abs(along) <= drawn.depth / 2 &&
        Math.abs(across) <= drawn.width / 2
      )
    }
  }
}

/**
 * The radius, in meters, a round marker reaches a press from its center:
 * at least `radius`, and never smaller on screen than a touch target at
 * `zoom` (pixels per meter).
 */
function grabRadius(radius: number, zoom: number): number {
  return Math.max(radius, TOUCH_TARGET_PX / 2 / zoom)
}

/**
 * The length, in meters, a room object's rectangle reaches a press along
 * one side (the Screen's thin bar, say): at least `length`, and never
 * shorter on screen than a touch target at `zoom` (pixels per meter).
 */
function grabLength(length: number, zoom: number): number {
  return Math.max(length, TOUCH_TARGET_PX / zoom)
}

/** How far `point` is from `shape`, in meters: 0 on or inside it. */
function distanceToShape(shape: GrabShape, point: FloorPoint): number {
  const dx = point.x - shape.center.x
  const dy = point.y - shape.center.y
  if ('radius' in shape) return Math.max(0, Math.hypot(dx, dy) - shape.radius)
  return Math.hypot(
    Math.max(0, Math.abs(dx) - shape.width / 2),
    Math.max(0, Math.abs(dy) - shape.depth / 2),
  )
}
