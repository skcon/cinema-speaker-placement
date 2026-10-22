import {
  type FloorPoint,
  overheadSideSign,
  type PlaceableId,
  type PlacedItem,
  type PlacedOverhead,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type PlacementGrade,
  type Wall,
} from '@/domain'
import { FLAT_ON_FLOOR, toScenePosition, type Vec3 } from '@/scene/top-down'

/**
 * The order the room view draws the kinds of item in, and so the order
 * their labels stack in: the MLP, the subwoofers, the listener-level
 * speakers, then the overheads on the ceiling.
 */
const DRAW_ORDER = [
  'mlp',
  'subwoofer',
  'listenerLevel',
  'overhead',
] as const satisfies readonly PlacedItem['kind'][]

/** The placed items, by id, in the order the room view draws them (DRAW_ORDER). */
export function itemsInDrawOrder(
  items: ReadonlyMap<PlaceableId, PlacedItem>,
): readonly PlacedItem[] {
  const all = [...items.values()]
  return DRAW_ORDER.flatMap((kind) => all.filter((item) => item.kind === kind))
}

/**
 * How each placement-range grade is drawn. Every marker also carries its
 * grade as text, so color is never the only cue.
 */
export const GRADE_STYLES = {
  ideal: { color: '#16a34a', label: 'ideal' },
  acceptable: { color: '#d97706', label: 'acceptable' },
  outside: { color: '#dc2626', label: 'outside' },
} as const satisfies Record<PlacementGrade, { color: string; label: string }>

/**
 * How a subwoofer is drawn: Dolby gives subwoofers no placement range, so
 * they get a neutral color and are labelled as ungraded.
 */
export const UNGRADED_STYLE = {
  color: '#64748b',
  label: 'ungraded',
} as const satisfies { color: string; label: string }

/**
 * The drawn size of a speaker cabinet seen from above, in meters: a
 * drawing size only, not a speaker spec.
 */
export const SPEAKER_FOOTPRINT = { width: 0.32, depth: 0.22 } as const

/** A screen direction: x to the right, y down. */
export type ScreenDirection = { x: number; y: number }

/** What the top-down scene draws for one speaker. */
export type SpeakerMarker = {
  position: Vec3
  /**
   * Lays the cabinet shape (drawn in its XY plane, front toward +y) flat on
   * the floor and turns its front the way the speaker aims (at the MLP).
   */
  rotation: Vec3
  color: string
  /** Channel and angle from the MLP, for example "L 26°". */
  label: string
  grade: PlacementGrade
  /**
   * Which way to push the label off the marker: straight across or straight
   * up or down the screen, whichever is closest to where the speaker aims
   * (at the MLP). Labels stay inside the room and, like on a floor plan,
   * line up instead of converging on the MLP.
   */
  labelDirection: ScreenDirection
}

export function speakerMarker({
  channel,
  position,
  aim,
  placementRange: {
    grade,
    azimuth: { shown },
  },
}: PlacedSpeaker): SpeakerMarker {
  const yaw = (aim.yaw * Math.PI) / 180
  // The top-down view draws room x to the right and room y downward, so
  // on screen the speaker faces the way it does on the floor plan.
  const facing = speakerFacing(aim)
  return {
    position: toScenePosition(position),
    // A turn of θ about the shape's normal points its +y side at room
    // (-sin θ, -cos θ) once FLAT_ON_FLOOR lays it down, so θ = -yaw.
    rotation: [-Math.PI / 2, 0, -yaw],
    color: GRADE_STYLES[grade].color,
    label: `${channel} ${shown}°`,
    grade,
    labelDirection: snapToAxis(facing),
  }
}

/**
 * Which way a speaker aimed `aim` faces on the floor plan, as a unit
 * vector in room (x, y): yaw is clockwise from facing the front wall (-y),
 * so it faces (sin yaw, -cos yaw). Its cabinet is drawn
 * SPEAKER_FOOTPRINT.depth deep along it.
 */
export function speakerFacing({ yaw }: PlacedSpeaker['aim']): FloorPoint {
  const radians = (yaw * Math.PI) / 180
  return { x: Math.sin(radians), y: -Math.cos(radians) }
}

/** The screen axis direction closest to `direction`. */
function snapToAxis({ x, y }: ScreenDirection): ScreenDirection {
  return Math.abs(x) > Math.abs(y)
    ? { x: Math.sign(x), y: 0 }
    : { x: 0, y: Math.sign(y) }
}

/**
 * The drawn size of a subwoofer cabinet seen from above, in meters, square
 * and lined up with the walls: a drawing size only, not a subwoofer spec.
 * Larger than a speaker's, so a speaker drawn over a subwoofer (the Center
 * above Subwoofer 1, say) leaves its outline showing.
 */
export const SUBWOOFER_FOOTPRINT = 0.44

/** What the top-down scene draws for one subwoofer. */
export type SubwooferMarker = {
  position: Vec3
  /** Lays the square flat on the floor, lined up with the walls. */
  rotation: Vec3
  color: string
  /** Its short id, for example "Sub2". */
  label: string
  /**
   * Which way to push the label off the marker: along its wall, to the
   * right for the front and back walls and down for the side walls, so it
   * stays clear of speaker labels, which point into the room.
   */
  labelDirection: ScreenDirection
}

const ALONG_WALL = {
  front: { x: 1, y: 0 },
  back: { x: 1, y: 0 },
  left: { x: 0, y: 1 },
  right: { x: 0, y: 1 },
} as const satisfies Record<Wall, ScreenDirection>

export function subwooferMarker({
  id,
  position,
  wall,
}: PlacedSubwoofer): SubwooferMarker {
  return {
    position: toScenePosition(position),
    rotation: FLAT_ON_FLOOR,
    color: UNGRADED_STYLE.color,
    label: id,
    labelDirection: ALONG_WALL[wall],
  }
}

/** One subwoofer in words, for example "Subwoofer 2 at the back wall". */
export function describeSubwoofer({ name, wall }: PlacedSubwoofer): string {
  return `${name} at the ${wall} wall`
}

/** One speaker in words, for example "Left Surround 115° (ideal)". */
export function describeSpeaker({
  name,
  placementRange: {
    grade,
    azimuth: { shown },
  },
}: PlacedSpeaker): string {
  return `${name} ${shown}° (${GRADE_STYLES[grade].label})`
}

/** The drawn radius of the MLP marker, a disc, in meters. */
export const MLP_MARKER_RADIUS = 0.18

/**
 * The drawn radius of an overhead speaker seen from above, in meters: a
 * round marker (the grille of an overhead speaker in the ceiling), so it
 * reads apart from the rectangular listener-level cabinets. A drawing size
 * only.
 */
export const OVERHEAD_MARKER_RADIUS = 0.17

/** The marker's ring starts this far out, as a share of its radius. */
export const OVERHEAD_MARKER_RING_INNER = 0.6

/** The marker's center dot, as a share of its radius. */
export const OVERHEAD_MARKER_DOT = 0.3

/** What the top-down scene draws for one overhead speaker. */
export type OverheadMarker = {
  /** On the ceiling. */
  position: Vec3
  /** Lays the round marker flat, facing up and down. */
  rotation: Vec3
  color: string
  /** Channel and elevation from the MLP, for example "Ltf 45°". */
  label: string
  grade: PlacementGrade
  /** Out toward its own side wall, clear of the listener-level labels. */
  labelDirection: ScreenDirection
}

export function overheadMarker({
  channel,
  position,
  placementRange: { grade, elevation },
}: PlacedOverhead): OverheadMarker {
  return {
    position: toScenePosition(position),
    rotation: FLAT_ON_FLOOR,
    color: GRADE_STYLES[grade].color,
    label: `${channel} ${elevation.shown}°`,
    grade,
    labelDirection: {
      x: overheadSideSign(channel),
      y: 0,
    },
  }
}

/**
 * An overhead's angles from the MLP in short: its angle where Dolby grades
 * one, then its elevation, for example "38° · elev. 45°".
 */
export function overheadAngles({
  placementRange: { azimuth, elevation },
}: PlacedOverhead): string {
  const elev = `elev. ${elevation.shown}°`
  return azimuth.grade === null ? elev : `${azimuth.shown}° · ${elev}`
}

/** One overhead in words, for example "Left Top Rear 142°, elevation 135° (ideal)". */
export function describeOverhead({
  name,
  placementRange: { azimuth, elevation, grade },
}: PlacedOverhead): string {
  const angle = azimuth.grade === null ? '' : ` ${azimuth.shown}°,`
  return `${name}${angle} elevation ${elevation.shown}° (${GRADE_STYLES[grade].label})`
}
