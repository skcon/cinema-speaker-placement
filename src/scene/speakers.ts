import type {
  PlacedSpeaker,
  PlacedSubwoofer,
  PlacementGrade,
  Wall,
} from '@/domain'
import { FLAT_ON_FLOOR, toScenePosition, type Vec3 } from '@/scene/top-down'

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
 * The ring around the recommended seat in the room view and its legend:
 * a color no grade uses.
 */
export const RECOMMENDED_SEAT_COLOR = '#7c3aed'

/** The "38% rule" reference line in the room view and its legend. */
export const RULE_OF_THUMB_COLOR = '#a3a3a3'

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
  // Yaw is clockwise from facing the front wall (-y). The top-down view
  // draws room x to the right and room y downward, so on screen the
  // speaker faces (sin yaw, -cos yaw).
  const facing = { x: Math.sin(yaw), y: -Math.cos(yaw) }
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
