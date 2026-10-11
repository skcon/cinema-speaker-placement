import type { Room, RoomPoint } from '@/domain'

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

/** A straight line on the floor, in room coordinates. */
export type Segment = [from: RoomPoint, to: RoomPoint]

/** Grid lines closer than this to a wall (in meters) are left out. */
const WALL_EPSILON = 1e-9

export function toScenePosition({ x, y, z }: RoomPoint): Vec3 {
  return [x, z, y]
}

/** The floor's corners: front left, front right, back right, back left. */
export function floorOutline({ length, width }: Room): RoomPoint[] {
  const half = width / 2
  return [
    { x: -half, y: 0, z: 0 },
    { x: half, y: 0, z: 0 },
    { x: half, y: length, z: 0 },
    { x: -half, y: length, z: 0 },
  ]
}

/**
 * Turns a Three.js plane or circle (drawn in its XY plane, facing +z) to lie
 * flat on the floor, facing up at the camera.
 */
export const FLAT_ON_FLOOR: Vec3 = [-Math.PI / 2, 0, 0]

/** A Three.js plane covering the floor: its center, rotation and size. */
export function floorPlane(room: Room) {
  return {
    position: toScenePosition({ x: 0, y: room.length / 2, z: 0 }),
    rotation: FLAT_ON_FLOOR,
    size: [room.width, room.length] as [width: number, height: number],
  }
}

/** Where the front wall meets the floor. */
export function frontWall({ width }: Room): Segment {
  return [
    { x: -width / 2, y: 0, z: 0 },
    { x: width / 2, y: 0, z: 0 },
  ]
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
): { across: Segment[]; down: Segment[] } {
  const half = width / 2
  const sideSteps = Math.floor((half - WALL_EPSILON) / spacing)
  const depthSteps = Math.floor((length - WALL_EPSILON) / spacing)
  const across = Array.from({ length: 2 * sideSteps + 1 }, (_, i) => {
    const x = (i - sideSteps) * spacing
    return [
      { x, y: 0, z: 0 },
      { x, y: length, z: 0 },
    ] satisfies Segment
  })
  const down = Array.from({ length: depthSteps }, (_, i) => {
    const y = (i + 1) * spacing
    return [
      { x: -half, y, z: 0 },
      { x: half, y, z: 0 },
    ] satisfies Segment
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
    position: [0, height, room.length / 2] as Vec3,
    // Turning the default camera (looking along -z, up +y) by -90° about x
    // makes it look down -y with its up vector along -z: the front wall.
    rotation: [-Math.PI / 2, 0, 0] as Vec3,
    zoom: zoom > 0 && Number.isFinite(zoom) ? zoom : 1,
    near: CAMERA_CLEARANCE / 2,
    far: height + CAMERA_CLEARANCE,
  }
}
