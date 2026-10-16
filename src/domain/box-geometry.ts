/**
 * Straight lines against axis-aligned boxes in room coordinates, for the
 * placement warnings: does a speaker's direct sound pass through a
 * furniture box?
 */
import type { RoomPoint } from './room'

/** An axis-aligned box, in meters; a side may be infinite. */
export type AxisBox = {
  readonly min: RoomPoint
  readonly max: RoomPoint
}

const AXES = ['x', 'y', 'z'] as const

/**
 * Whether the straight segment from `from` to `to` passes through `box`,
 * its surface included (the slab method: the part of the segment between
 * each pair of parallel sides, intersected). A segment that starts or
 * ends inside the box passes through it.
 */
export function segmentHitsBox(
  from: RoomPoint,
  to: RoomPoint,
  box: AxisBox,
): boolean {
  let enter = 0
  let leave = 1
  for (const axis of AXES) {
    const start = from[axis]
    const step = to[axis] - start
    const low = box.min[axis]
    const high = box.max[axis]
    if (step === 0) {
      if (start < low || start > high) return false
      continue
    }
    const atLow = (low - start) / step
    const atHigh = (high - start) / step
    enter = Math.max(enter, Math.min(atLow, atHigh))
    leave = Math.min(leave, Math.max(atLow, atHigh))
    if (enter > leave) return false
  }
  return true
}
