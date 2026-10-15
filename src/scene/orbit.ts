import {
  floorCorners,
  type Room,
  type RoomPoint,
  type RoomSegment,
  toRadians,
  wallBases,
} from '@/domain'
import { toScenePosition, type Vec3, type ViewportSize } from '@/scene/top-down'

/**
 * Pure geometry for the 3D orbit view: a perspective camera that frames the
 * whole room box, floor to ceiling, and the limits the orbit controls keep
 * to. It uses the same room -> Three.js mapping as the top-down view
 * (toScenePosition). View only: nothing here moves an item.
 */

/** The camera's vertical field of view, in degrees. */
const FIELD_OF_VIEW = 45
/** How far above level the starting view looks down into the room, in degrees. */
const START_ELEVATION = 30
/** Extra room around the framed room box, as a factor of the field of view it fills. */
const FRAME_MARGIN = 1.08
/** The closest the camera gets to the room's middle, as a share of the room box's half-diagonal. */
const MIN_DISTANCE_SHARE = 0.5
/** The farthest the camera zooms out, as a multiple of the starting distance. */
const MAX_DISTANCE_FACTOR = 2.5
/** The lowest the camera orbits: just above level with the room's middle, never under the floor. */
const MAX_POLAR_ANGLE = toRadians(85)
/** The near clipping plane, in meters: close enough to zoom in past the walls. */
const NEAR = 0.05

/** The middle of the room box, which the camera orbits around. */
function roomMiddle({ length, height }: Room): Vec3 {
  return toScenePosition({ x: 0, y: length / 2, z: height / 2 })
}

/** Half the room box's diagonal: the radius of a sphere around the whole room. */
function halfDiagonal({ length, width, height }: Room): number {
  return Math.hypot(length, width, height) / 2
}

/**
 * How far from the room's middle the starting camera sits so every corner
 * of the room box fits the viewport, across and down, with a margin. Each
 * corner is taken in the camera's frame (right = +x, up and toward the
 * camera tilted by the elevation); a corner `toward` meters nearer the
 * camera and `side` meters off-center needs a distance of at least
 * toward + side / tan(half the field of view) on that axis.
 */
function framingDistance(room: Room, { width, height }: ViewportSize): number {
  const aspect = width > 0 && height > 0 ? width / height : 1
  const tanVertical = Math.tan(toRadians(FIELD_OF_VIEW) / 2) / FRAME_MARGIN
  const tanHorizontal = tanVertical * aspect
  const elevation = toRadians(START_ELEVATION)
  const [sin, cos] = [Math.sin(elevation), Math.cos(elevation)]
  const halfLength = room.length / 2
  const halfHeight = room.height / 2
  const halfWidth = room.width / 2
  const needed = [-halfLength, halfLength].flatMap((back) =>
    [-halfHeight, halfHeight].map((up) => {
      const toward = cos * back + sin * up
      const vertical = Math.abs(cos * up - sin * back)
      return (
        toward + Math.max(halfWidth / tanHorizontal, vertical / tanVertical)
      )
    }),
  )
  return Math.max(...needed)
}

/**
 * The starting perspective camera: behind the seats (beyond the back wall)
 * and above the ceiling, looking down at the room's middle toward the front
 * wall, so +x stays on the right as in the top-down view. The whole room
 * box fits the viewport.
 */
export function orbitCamera(room: Room, size: ViewportSize) {
  const distance = framingDistance(room, size)
  const elevation = toRadians(START_ELEVATION)
  const target = roomMiddle(room)
  const position = toScenePosition({
    x: 0,
    y: room.length / 2 + distance * Math.cos(elevation),
    z: room.height / 2 + distance * Math.sin(elevation),
  })
  return {
    position,
    target,
    fov: FIELD_OF_VIEW,
    near: NEAR,
    far: MAX_DISTANCE_FACTOR * distance + 2 * halfDiagonal(room),
  }
}

/**
 * Limits for the orbit controls: zoom from inside the room out to well
 * beyond the starting view, and never orbit below the floor.
 */
export function orbitLimits(room: Room, size: ViewportSize) {
  return {
    minDistance: MIN_DISTANCE_SHARE * halfDiagonal(room),
    maxDistance: MAX_DISTANCE_FACTOR * framingDistance(room, size),
    maxPolarAngle: MAX_POLAR_ANGLE,
  }
}

/** The room box's 12 edges: the floor outline, the ceiling outline and the 4 vertical corners. */
export function roomBoxEdges(room: Room): RoomSegment[] {
  const up = (point: RoomPoint): RoomPoint => ({ ...point, z: room.height })
  const floor = Object.values(wallBases(room))
  const ceiling = floor.map(([from, to]): RoomSegment => [up(from), up(to)])
  const corners = floorCorners(room).map((corner): RoomSegment => [
    corner,
    up(corner),
  ])
  return [...floor, ...ceiling, ...corners]
}

/**
 * The room view's camera: the top-down plan (the default, where items are
 * dragged) or the 3D orbit view (view only). View state: never part of the
 * config, the share link or the undo history.
 */
export const CAMERA_VIEWS = {
  'top-down': { label: 'Top-down' },
  '3d': { label: '3D' },
} as const

export type CameraView = keyof typeof CAMERA_VIEWS

export const CAMERA_VIEW_KINDS = Object.keys(CAMERA_VIEWS) as CameraView[]
