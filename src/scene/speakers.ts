import type { PlacedSpeaker, PlacementGrade, RoomPoint } from '@/domain'
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
   * the floor and turns its front toward the MLP.
   */
  rotation: Vec3
  color: string
  /** Channel and angle from the MLP, for example "L 26°". */
  label: string
  grade: PlacementGrade
  /**
   * Which way to push the label off the marker: straight across or straight
   * up or down the screen, whichever points most toward the MLP. Labels
   * stay inside the room and, like on a floor plan, line up instead of
   * converging on the MLP.
   */
  labelDirection: ScreenDirection
}

export function speakerMarker(
  { channel, position, placementRange: { angle, grade } }: PlacedSpeaker,
  mlp: RoomPoint,
): SpeakerMarker {
  const dx = mlp.x - position.x
  const dy = mlp.y - position.y
  const distance = Math.hypot(dx, dy)
  // The top-down view draws room x to the right and room y downward.
  const towardMlp =
    distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 1 }
  return {
    position: toScenePosition(position),
    // A turn of θ about the shape's normal points its +y side at room
    // (-sin θ, -cos θ) once FLAT_ON_FLOOR lays it down.
    rotation: [-Math.PI / 2, 0, Math.atan2(-towardMlp.x, -towardMlp.y)],
    color: GRADE_STYLES[grade].color,
    label: `${channel} ${angle}°`,
    grade,
    labelDirection: snapToAxis(towardMlp),
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
  placementRange: { angle, grade },
}: PlacedSpeaker): string {
  return `${name} ${angle}° (${GRADE_STYLES[grade].label})`
}
