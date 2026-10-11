import type { PlacedSpeaker, PlacementGrade } from '@/domain'
import { toScenePosition, type Vec3 } from '@/scene/top-down'

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
