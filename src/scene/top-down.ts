import {
  floorCenter,
  type FloorPoint,
  type Room,
  type RoomPoint,
  type RoomSegment,
} from '@/domain'

/**
 * Pure geometry for the top-down room view. Room coordinates (src/domain/room.ts:
 * x right, y front-to-back, z up) map to Three.js, which has y up:
 * room (x, y, z) -> Three.js (x, z, y). The floor lies in the Three.js XZ
 * plane, and the camera looks straight down with the front wall at the top.
 */

/** A Three.js position or Euler rotation. */
export type Vec3 = [x: number, y: number, z: number]
export type ViewportSize = { width: number; height: number }

/**
 * Free space around the room in the view, in pixels, so labels outside the
 * walls fit at any zoom.
 */
const VIEW_MARGIN_PX = 32
/** How far above the ceiling the camera sits, in meters. */
const CAMERA_CLEARANCE = 10

/** Grid lines closer than this to a wall (in meters) are left out. */
const WALL_EPSILON = 1e-9

export function toScenePosition({ x, y, z }: RoomPoint): Vec3 {
  return [x, z, y]
}

/** The floor-plan point under a Three.js point: the inverse of toScenePosition, height dropped. */
export function toFloorPoint({ x, z }: { x: number; z: number }): FloorPoint {
  return { x, y: z }
}

/**
 * The smallest touch target, in pixels: the size WCAG 2.5.5 (AAA) and the
 * Apple and Android guidelines give for something a finger has to hit.
 */
const TOUCH_TARGET_PX = 44

/**
 * The radius, in meters, of the area that picks up a marker for dragging:
 * at least `radius`, and never smaller on screen than a touch target at
 * this zoom (pixels per meter).
 */
export function grabRadius(radius: number, zoom: number): number {
  return Math.max(radius, TOUCH_TARGET_PX / 2 / zoom)
}

/**
 * The length, in meters, of a side of the area that picks up a long marker
 * (the Screen's bar) for dragging: at least `length`, and never shorter on
 * screen than a touch target at this zoom (pixels per meter).
 */
export function grabLength(length: number, zoom: number): number {
  return Math.max(length, TOUCH_TARGET_PX / zoom)
}

/** From the pointer to a marker's center when it is grabbed. */
export function grabOffset(at: FloorPoint, pointer: FloorPoint): FloorPoint {
  return { x: at.x - pointer.x, y: at.y - pointer.y }
}

/** Where a grabbed marker goes with the pointer at `pointer`: it keeps the grab offset. */
export function draggedTo(pointer: FloorPoint, offset: FloorPoint): FloorPoint {
  return { x: pointer.x + offset.x, y: pointer.y + offset.y }
}

/**
 * A quarter turn about x that points an object's +z axis straight up. A
 * Three.js plane or circle (drawn facing +z) then lies flat on the floor,
 * facing up; a camera (looking along -z with +y up) looks straight down with
 * its up vector toward the front wall.
 */
export const FLAT_ON_FLOOR: Vec3 = [-Math.PI / 2, 0, 0]

/** A Three.js plane covering the floor: its center, rotation and size. */
export function floorPlane(room: Room) {
  return {
    position: toScenePosition(floorCenter(room)),
    rotation: FLAT_ON_FLOOR,
    size: [room.width, room.length] as [width: number, height: number],
  }
}

/**
 * Floor grid lines `spacing` meters apart, inside the walls. Lines across
 * the view (constant x) are spaced out from the center line, so one runs
 * through the MLP; lines down the view (constant y) are counted from the
 * front wall, so they read as distances from it.
 */
export function floorGrid(
  { length, width }: Room,
  spacing: number,
): { across: RoomSegment[]; down: RoomSegment[] } {
  const half = width / 2
  const sideSteps = Math.floor((half - WALL_EPSILON) / spacing)
  const depthSteps = Math.floor((length - WALL_EPSILON) / spacing)
  const across = Array.from({ length: 2 * sideSteps + 1 }, (_, i) => {
    const x = (i - sideSteps) * spacing
    return [
      { x, y: 0, z: 0 },
      { x, y: length, z: 0 },
    ] satisfies RoomSegment
  })
  const down = Array.from({ length: depthSteps }, (_, i) => {
    const y = (i + 1) * spacing
    return [
      { x: -half, y, z: 0 },
      { x: half, y, z: 0 },
    ] satisfies RoomSegment
  })
  return { across, down }
}

/**
 * An orthographic camera above the room's center, looking straight down,
 * with the front wall at the top of the view and +x on the right. `zoom` is
 * pixels per meter (react-three-fiber sizes the default orthographic frustum
 * in pixels) and fits the room into the viewport inside a pixel margin.
 */
export function topDownCamera(room: Room, size: ViewportSize) {
  const fitsAcross = (size.width - 2 * VIEW_MARGIN_PX) / room.width
  const fitsDown = (size.height - 2 * VIEW_MARGIN_PX) / room.length
  const zoom = Math.min(fitsAcross, fitsDown)
  const height = room.height + CAMERA_CLEARANCE
  return {
    position: toScenePosition({ ...floorCenter(room), z: height }),
    rotation: FLAT_ON_FLOOR,
    zoom: zoom > 0 && Number.isFinite(zoom) ? zoom : 1,
    near: CAMERA_CLEARANCE / 2,
    far: height + CAMERA_CLEARANCE,
  }
}
