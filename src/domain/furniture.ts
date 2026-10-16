/**
 * Furniture boxes (GLOSSARY.md): a cabinet, table, shelf or anything else
 * as a box on the floor plan, a room object. They are drawn and give
 * placement warnings (W4 and W6), and are never part of the estimated
 * response (ADR 0006). A Room has up to FURNITURE.maxCount of them, and
 * room-objects.ts keeps their list and ids.
 *
 * A box stands on the floor. `x` and `y` are its middle on the floor plan,
 * and it turns in 90° steps: at rotation 0 its width runs across the room
 * (along x), its depth along it (y), and its front faces the back wall.
 * Each turn is a quarter turn clockwise seen from above with the front wall
 * at the top, so at 90 its front faces the left wall. Every box stays
 * inside the Room.
 */
import { ROUNDING_SLACK, toMillimeter } from './manual-positions'
import {
  hasValidLengths,
  type LengthTolerance,
  type ObjectLengths,
} from './object-lengths'
import { clamp, type AcceptedRange } from './range'
import { FURNITURE } from './reference'
import type { FloorPoint, Room } from './room'

/** How a box is turned, in degrees clockwise seen from above. */
export const FURNITURE_ROTATIONS = [0, 90, 180, 270] as const

export type FurnitureRotation = (typeof FURNITURE_ROTATIONS)[number]

/** A furniture box, in meters (see above). */
export type FurnitureBox = {
  /** What it is, for example "Cabinet" (see checkFurnitureName). */
  name: string
  /** Side to side, seen from its front. */
  width: number
  /** Front to back. */
  depth: number
  /** From the floor to its top. */
  height: number
  /** Where its middle is across the room, in room x: 0 is centred. */
  x: number
  /** Where its middle is, from the front wall (room y). */
  y: number
  rotation: FurnitureRotation
}

/** The boxes the sidebar adds, each with its own name and size. */
export const FURNITURE_PRESETS = ['cabinet', 'table', 'shelf'] as const

export type FurniturePreset = (typeof FURNITURE_PRESETS)[number]

/** The longest name a box may have, in characters. */
export const FURNITURE_NAME_MAX_LENGTH: number = FURNITURE.nameMaxLength

/**
 * The characters a name may have: Western European letters (A–Z and the
 * accented letters of Latin-1, such as é or ö), digits, spaces and
 * - ' & ( ) . , /. A share link carries them cheaply, which keeps eight
 * names inside the URL budget.
 */
const NAME_CHARACTERS = /^[A-Za-z0-9À-ÖØ-öø-ÿ '&().,/-]*$/

/** Why a name is rejected. */
export type FurnitureNameProblem = 'empty' | 'too-long' | 'characters'

/**
 * `null` when `name` is a name a box may have: not empty or only spaces,
 * at most FURNITURE_NAME_MAX_LENGTH characters, and only the characters
 * above. Spaces around it don't count (they are trimmed when it is set).
 */
export function checkFurnitureName(name: string): FurnitureNameProblem | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'empty'
  if (trimmed.length > FURNITURE_NAME_MAX_LENGTH) return 'too-long'
  if (!NAME_CHARACTERS.test(trimmed)) return 'characters'
  return null
}

/**
 * The box's lengths edited as lengths (see FURNITURE_LENGTHS). Where it is is edited as
 * `fromLeftWall` and `fromFrontWall`: from the left wall to its left side,
 * and from the front wall to its side nearest it, as it is turned.
 */
export type FurnitureDimension =
  'width' | 'depth' | 'height' | 'fromLeftWall' | 'fromFrontWall'

/** Whether the box is turned a quarter turn, so its width runs along y. */
function isTurned({ rotation }: FurnitureBox): boolean {
  return rotation === 90 || rotation === 270
}

/** Where a box is on the floor plan: an axis-aligned rectangle, in meters. */
export type FurnitureFootprint = {
  /** Its sides, in room x. */
  readonly left: number
  readonly right: number
  /** Its sides, from the front wall (room y). */
  readonly front: number
  readonly back: number
}

/** The rectangle the box covers on the floor plan, as it is turned. */
export function furnitureFootprint(box: FurnitureBox): FurnitureFootprint {
  const [alongX, alongY] = extents(box)
  return {
    left: box.x - alongX / 2,
    right: box.x + alongX / 2,
    front: box.y - alongY / 2,
    back: box.y + alongY / 2,
  }
}

/** How far the box reaches along room x and room y, as it is turned. */
function extents(box: FurnitureBox): [alongX: number, alongY: number] {
  return isTurned(box) ? [box.depth, box.width] : [box.width, box.depth]
}

/**
 * How far a stored box may reach past a wall, in meters: a share link
 * writes its sizes and position to the millimeter (roundFurnitureForLink),
 * which can move a side half a millimeter for each.
 */
const FIT_SLACK = 2 * ROUNDING_SLACK

/**
 * The accepted range of each of the box's dimensions in `room`: FURNITURE's
 * limits, and inside the Room. Its width and depth may reach the wall they
 * run along (a wider box moves in from a wall, see FURNITURE_LENGTHS.set).
 * Stored, a box may reach FIT_SLACK past its limits and the walls.
 */
function furnitureLimits(
  room: Room,
  box: FurnitureBox,
  tolerance: LengthTolerance,
): Record<FurnitureDimension, AcceptedRange> {
  const { width, depth, height } = FURNITURE.limits
  const slack = tolerance === 'stored' ? FIT_SLACK : 0
  const [acrossFor, alongFor] = isTurned(box)
    ? [room.length, room.width]
    : [room.width, room.length]
  const [alongX, alongY] = extents(box)
  // From a wall: between it and the other wall less the box. Never an
  // empty range, even for a stored box a little wider than the room.
  const fromWall = (wall: number, along: number) => ({
    min: 0 - slack, // +0 when typed, not -0
    max: Math.max(-slack, wall - along) + slack,
  })
  return {
    width: { min: width.min, max: Math.min(width.max, acrossFor) + slack },
    depth: { min: depth.min, max: Math.min(depth.max, alongFor) + slack },
    height: { min: height.min, max: Math.min(height.max, room.height) + slack },
    fromLeftWall: fromWall(room.width, alongX),
    fromFrontWall: fromWall(room.length, alongY),
  }
}

/**
 * The box's lengths: its size, and where it is as distances from the left
 * and front walls to its nearest sides, as it is turned. A box that grows
 * past a wall moves in from it.
 */
export const FURNITURE_LENGTHS: ObjectLengths<
  FurnitureBox,
  FurnitureDimension
> = {
  dimensions: ['width', 'depth', 'height', 'fromLeftWall', 'fromFrontWall'],
  limits: furnitureLimits,
  read: (room, box, dimension) => {
    const { left, front } = furnitureFootprint(box)
    switch (dimension) {
      case 'fromLeftWall':
        return left + room.width / 2
      case 'fromFrontWall':
        return front
      default:
        return box[dimension]
    }
  },
  set: (room, box, dimension, meters) => {
    const [alongX, alongY] = extents(box)
    switch (dimension) {
      case 'fromLeftWall':
        return { ...box, x: meters + alongX / 2 - room.width / 2 }
      case 'fromFrontWall':
        return { ...box, y: meters + alongY / 2 }
      default:
        return keepInRoom(room, { ...box, [dimension]: meters })
    }
  },
}

/** The box with another name, trimmed, or null when it is rejected. */
export function withFurnitureName(
  box: FurnitureBox,
  name: string,
): FurnitureBox | null {
  return checkFurnitureName(name) === null
    ? { ...box, name: name.trim() }
    : null
}

/**
 * Whether the box is one a config may hold in `room`: an accepted name, a
 * quarter turn, and every length inside its stored limits (so the whole
 * box inside the Room, to the millimeter).
 */
export function isValidFurnitureBox(room: Room, box: FurnitureBox): boolean {
  return (
    checkFurnitureName(box.name) === null &&
    box.name === box.name.trim() &&
    FURNITURE_ROTATIONS.includes(box.rotation) &&
    hasValidLengths(FURNITURE_LENGTHS, room, box)
  )
}

/**
 * The box a Room gets for `preset`: FURNITURE's name and size for it,
 * unturned, its back against the middle of the front wall (where a TV
 * cabinet goes; drag it where it belongs), fitted into the room.
 */
export function newFurnitureBox(
  room: Room,
  preset: FurniturePreset,
): FurnitureBox {
  const { name, width, depth, height } = FURNITURE.presets[preset]
  return fitFurnitureToRoom(room, {
    name,
    width,
    depth,
    height,
    x: 0,
    y: depth / 2,
    rotation: 0,
  })
}

/** The box dragged on the floor plan to `to`, stopped at the walls. */
export function furnitureMovedTo(
  room: Room,
  box: FurnitureBox,
  to: FloorPoint,
): FurnitureBox {
  if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return box
  const moved = keepInRoom(room, { ...box, x: to.x, y: to.y })
  return moved.x === box.x && moved.y === box.y ? box : moved
}

/**
 * The box turned a quarter turn clockwise about its middle, moved in from
 * any wall it would cross. It stays as it was when it would not fit the
 * room turned (a box longer than the room is wide).
 */
export function furnitureTurned(room: Room, box: FurnitureBox): FurnitureBox {
  const rotation = FURNITURE_ROTATIONS[
    (FURNITURE_ROTATIONS.indexOf(box.rotation) + 1) % FURNITURE_ROTATIONS.length
  ] as FurnitureRotation
  const turned = { ...box, rotation }
  const [alongX, alongY] = extents(turned)
  if (alongX > room.width || alongY > room.length) return box
  return keepInRoom(room, turned)
}

/** The box's middle moved in, if needed, so the whole box is inside the Room. */
function keepInRoom(room: Room, box: FurnitureBox): FurnitureBox {
  const [alongX, alongY] = extents(box)
  const acrossRoom = Math.max(0, (room.width - alongX) / 2)
  const x = clamp(box.x, -acrossRoom, acrossRoom)
  const y = clamp(
    box.y,
    alongY / 2,
    Math.max(alongY / 2, room.length - alongY / 2),
  )
  return x === box.x && y === box.y ? box : { ...box, x, y }
}

/**
 * The box sized and moved, if needed, so it fits `room` (after the Room
 * shrinks): no wider or deeper than the walls it runs along, no taller
 * than the ceiling, and moved in from the walls. A box that fits comes
 * back as it was.
 */
export function fitFurnitureToRoom(
  room: Room,
  box: FurnitureBox,
): FurnitureBox {
  const limits = furnitureLimits(room, box, 'typed')
  const width = Math.min(box.width, limits.width.max)
  const depth = Math.min(box.depth, limits.depth.max)
  const height = Math.min(box.height, limits.height.max)
  const sized =
    width === box.width && depth === box.depth && height === box.height
      ? box
      : { ...box, width, depth, height }
  return keepInRoom(room, sized)
}

/**
 * The box as a share link stores it: its lengths and position to the
 * millimeter. A typed imperial size is a long binary fraction in meters,
 * and eight boxes of them would not fit the URL budget; the millimeter is
 * well under the 0.1 in the app shows.
 */
export function roundFurnitureForLink(box: FurnitureBox): FurnitureBox {
  return {
    ...box,
    width: toMillimeter(box.width),
    depth: toMillimeter(box.depth),
    height: toMillimeter(box.height),
    x: toMillimeter(box.x),
    y: toMillimeter(box.y),
  }
}

/** A furniture box as a solid in the Room, in meters: from the floor up. */
export type FurnitureSolid = FurnitureFootprint & {
  /** Its top, above the floor. */
  readonly top: number
}

/** Where the box is in the Room. */
export function furnitureSolid(box: FurnitureBox): FurnitureSolid {
  return { ...furnitureFootprint(box), top: box.height }
}

/**
 * How the app names box `index` (from 0) in words, for example
 * "Cabinet (box 2)": names may repeat, the number doesn't.
 */
export function furnitureLabel(box: FurnitureBox, index: number): string {
  return `${box.name} (box ${index + 1})`
}
