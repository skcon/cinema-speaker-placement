/**
 * Ideal gaps: where auto-place found no position for a speaker with every
 * placement-range grade ideal (GLOSSARY.md, Auto-place; ADR 0005,
 * amendment for #151), which angles could not be ideal and which walls'
 * clearance is in the way, and the sidebar's words for it.
 *
 * Listener-level speakers find their gaps in placement.ts, overheads in
 * overhead-placement.ts; both only for an auto speaker, from the seat it
 * is installed for.
 */
import {
  channelName,
  type AngleRange,
  type ChannelId,
  type OverheadChannelId,
} from './dolby-layouts'
import { WALLS, type Wall } from './room'

/** An angle Dolby grades: a listener-level speaker has an azimuth, an overhead both. */
export type GradedAngle = 'azimuth' | 'elevation'

/** One angle that could not be ideal, with its ideal range. */
export type IdealGapAngle = {
  readonly angle: GradedAngle
  readonly ideal: AngleRange
}

/** Why an auto speaker has no position with every grade ideal. */
export type IdealGap = {
  readonly channel: ChannelId | OverheadChannelId
  /**
   * The angles that can't be ideal anywhere inside the wall clearance, in
   * the order azimuth, elevation. When `together`, each could be ideal on
   * its own but not both at once.
   */
  readonly angles: readonly IdealGapAngle[]
  readonly together: boolean
  /** The walls whose clearance is in the way, in WALLS order. */
  readonly walls: readonly Wall[]
}

/**
 * Who the speakers are installed for: the MLP (Speakers follow the seat
 * on), or the seat they stay installed for (off).
 */
export type GapSubject = 'mlp' | 'installed-for'

const SUBJECT: Record<GapSubject, string> = {
  mlp: 'the MLP',
  'installed-for': 'the seat the speakers stay installed for,',
}

/**
 * The sidebar's sentence for an ideal gap: the speaker, the walls in the
 * way and the angles with their ideal ranges, without lengths (so in any
 * units). For example "Left Top Front (Ltf) has no position where every
 * grade is ideal: the front wall is too close to the MLP for its ideal
 * elevation (30°–55°)."
 */
export function idealGapMessage(gap: IdealGap, subject: GapSubject): string {
  const speaker = `${channelName(gap.channel)} (${gap.channel})`
  return (
    `${speaker} has no position where every grade is ideal: ` +
    `${wallsInTheWay(gap.walls, subject)} for its ideal ${angles(gap)}.`
  )
}

/** "the room is too narrow", "the front wall is too close to the MLP", or both. */
function wallsInTheWay(walls: readonly Wall[], subject: GapSubject): string {
  const narrow = walls.includes('left') && walls.includes('right')
  const close = WALLS.filter(
    (wall) => walls.includes(wall) && !(narrow && isSideWall(wall)),
  )
  const parts = [
    ...(narrow ? ['the room is too narrow'] : []),
    ...(close.length > 0
      ? [
          `the ${joinWith(close, 'and')} ${close.length > 1 ? 'walls are' : 'wall is'} ` +
            `too close to ${SUBJECT[subject]}`,
        ]
      : []),
  ]
  return parts.length > 0 ? parts.join(' and ') : 'the room is too small'
}

function isSideWall(wall: Wall): boolean {
  return wall === 'left' || wall === 'right'
}

/** "azimuth (30°–60°)", "... and elevation (...) together" or "... or elevation (...)". */
function angles({ angles, together }: IdealGap): string {
  const named = angles.map(({ angle, ideal }) => `${angle} (${range(ideal)})`)
  return together ? `${joinWith(named, 'and')} together` : joinWith(named, 'or')
}

/** "30°–55°", or "0°" for a single angle. */
function range({ min, max }: AngleRange): string {
  return min === max ? `${min}°` : `${min}°–${max}°`
}

/** "a", "a and b", "a, b and c". */
function joinWith(items: readonly string[], word: string): string {
  const last = items.at(-1) ?? ''
  return items.length < 2
    ? last
    : `${items.slice(0, -1).join(', ')} ${word} ${last}`
}
