/**
 * Convex regions of a horizontal plane (a floor plan or the ceiling), as
 * the intersection of half-planes, and the nearest point in one. Pure
 * geometry: auto-place uses it to find where a speaker's angles from the
 * MLP all stay inside their ranges (overhead-placement.ts).
 */
import type { FloorPoint } from './room'

/** The points p with normal · (p − through) ≥ 0. */
export type HalfPlane = {
  readonly through: FloorPoint
  readonly normal: FloorPoint
}

/** A convex polygon's corners in order; empty when the region is empty. */
export type ConvexPolygon = readonly FloorPoint[]

/** How far inside a half-plane counts as on its edge (meters). */
const ON_EDGE = 1e-9

function side({ through, normal }: HalfPlane, point: FloorPoint): number {
  return normal.x * (point.x - through.x) + normal.y * (point.y - through.y)
}

/** Each edge of a polygon as [from, to], the last one back to the first corner. */
function edges(
  polygon: ConvexPolygon,
): (readonly [from: FloorPoint, to: FloorPoint])[] {
  return polygon.map(
    (corner, index) =>
      [corner, polygon[(index + 1) % polygon.length] ?? corner] as const,
  )
}

/** The axis-aligned rectangle [minX, maxX] × [minY, maxY] as a polygon. */
export function rectangle(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): ConvexPolygon {
  if (minX > maxX || minY > maxY) return []
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
}

/** The part of `polygon` inside `plane` (Sutherland–Hodgman, one edge). */
export function clipToHalfPlane(
  polygon: ConvexPolygon,
  plane: HalfPlane,
): ConvexPolygon {
  const kept: FloorPoint[] = []
  for (const [current, next] of edges(polygon)) {
    const a = side(plane, current)
    const b = side(plane, next)
    if (a >= -ON_EDGE) kept.push(current)
    if (a >= -ON_EDGE !== b >= -ON_EDGE) {
      const t = a / (a - b)
      kept.push({
        x: current.x + t * (next.x - current.x),
        y: current.y + t * (next.y - current.y),
      })
    }
  }
  return kept
}

/** The part of `polygon` inside every one of `planes`. */
export function clipToHalfPlanes(
  polygon: ConvexPolygon,
  planes: readonly HalfPlane[],
): ConvexPolygon {
  return planes.reduce(clipToHalfPlane, polygon)
}

/** The point of segment a–b nearest to `point`. */
function nearestOnSegment(
  a: FloorPoint,
  b: FloorPoint,
  point: FloorPoint,
): FloorPoint {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return a
  const t = Math.min(
    Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0),
    1,
  )
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/** Whether `point` is inside (or on the edge of) a convex polygon. */
function contains(polygon: ConvexPolygon, point: FloorPoint): boolean {
  if (polygon.length < 3) return false
  let sign = 0
  for (const [a, b] of edges(polygon)) {
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
    if (Math.abs(cross) <= ON_EDGE) continue
    if (sign === 0) sign = Math.sign(cross)
    else if (Math.sign(cross) !== sign) return false
  }
  return true
}

/**
 * The point of a convex polygon nearest to `point`: the point itself when
 * it is inside, else the nearest point of its edges. Null when the polygon
 * is empty.
 */
export function nearestPointIn(
  polygon: ConvexPolygon,
  point: FloorPoint,
): FloorPoint | null {
  if (polygon.length === 0) return null
  if (contains(polygon, point)) return point
  let best: FloorPoint | null = null
  let bestDistance = Infinity
  for (const [a, b] of edges(polygon)) {
    const candidate = nearestOnSegment(a, b, point)
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

/**
 * The x range a convex polygon covers along the line at `y`, or null where
 * the line misses it.
 */
export function xRangeAt(
  polygon: ConvexPolygon,
  y: number,
): { readonly min: number; readonly max: number } | null {
  const xs: number[] = []
  for (const [a, b] of edges(polygon)) {
    const low = Math.min(a.y, b.y) - ON_EDGE
    const high = Math.max(a.y, b.y) + ON_EDGE
    if (y < low || y > high) continue
    if (Math.abs(b.y - a.y) <= ON_EDGE) xs.push(a.x, b.x)
    else xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x))
  }
  if (xs.length === 0) return null
  return { min: Math.min(...xs), max: Math.max(...xs) }
}
