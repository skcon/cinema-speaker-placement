import {
  angleOnSide,
  CHANNELS,
  OVERHEAD_CHANNELS,
  type AngleRange,
  type AngleReference,
  type ChannelReference,
  type ChannelSide,
  type NoAngleRange,
  type OverheadChannelReference,
} from './dolby-layouts'

/** How a speaker's angle from the MLP compares with its placement range. */
export type PlacementGrade = 'ideal' | 'acceptable' | 'outside'

/** One angle of a speaker, graded against Dolby's ranges for it. */
export type AngleCheck = AngleReference & {
  /**
   * The measured angle in degrees: an azimuth is signed (src/domain/room.ts),
   * an elevation in Dolby's side-view convention (0° to 180°).
   */
  readonly degrees: number
  /**
   * The angle that was graded and is shown, to the nearest whole degree: an
   * azimuth on the channel's own side and unsigned.
   */
  readonly shown: number
  readonly grade: PlacementGrade
}

/** An angle Dolby gives no range for: measured and shown, not graded. */
export type UngradedAngle = NoAngleRange & {
  readonly degrees: number
  readonly shown: number
  readonly grade: null
}

/** A speaker's placement-range check, with the range and its sources. */
export type PlacementRangeCheck = {
  readonly grade: PlacementGrade
  readonly azimuth: AngleCheck
}

/** An overhead's check: an elevation, and an azimuth unless Dolby gives none. */
export type OverheadPlacementRangeCheck = {
  /** The worst grade of the graded parts. */
  readonly grade: PlacementGrade
  readonly azimuth: AngleCheck | UngradedAngle
  readonly elevation: AngleCheck
}

/**
 * A placed item's placement-range check: a listener-level speaker's or an
 * overhead's, or a subwoofer's, which Dolby gives no range for.
 */
export type PlacementGrading =
  | { readonly kind: 'speaker'; readonly check: PlacementRangeCheck }
  | { readonly kind: 'overhead'; readonly check: OverheadPlacementRangeCheck }
  | { readonly kind: 'subwoofer' }

/** How an angle is rounded before it is graded (see checkPlacementRange). */
export const ANGLE_GRADING = {
  assumption:
    "Our modelling assumption, not Dolby's: Dolby's ranges are whole " +
    'degrees, so each angle is rounded to the nearest whole degree, the ' +
    'number shown, before it is graded.',
} as const satisfies { assumption: string }

/**
 * Grade a channel's azimuth from the MLP against its Dolby placement range:
 * inside the ideal range is ideal, inside the wider acceptable range (L/R
 * only) is acceptable, anything else (including the wrong side of the
 * room) is outside.
 *
 * Our modelling assumption, not Dolby's: Dolby's ranges are whole degrees,
 * so the angle is graded to the nearest whole degree, the same number the
 * app shows. It also keeps floating-point noise (a Center at 1e-15°) from
 * changing a grade.
 */
export function checkPlacementRange(
  { channel, azimuth: reference }: ChannelReference,
  azimuth: number,
): PlacementRangeCheck {
  const azimuthCheck = checkAzimuth(CHANNELS[channel].side, reference, azimuth)
  return { grade: azimuthCheck.grade, azimuth: azimuthCheck }
}

/**
 * Grade an overhead channel's azimuth and its elevation (Dolby's side-view
 * convention, src/domain/room.ts) against its Dolby placement range, each
 * as checkPlacementRange grades an azimuth; the overall grade is the worse
 * of the two. Where Dolby gives no azimuth (top middle), only the
 * elevation is graded.
 */
export function checkOverheadPlacementRange(
  {
    channel,
    azimuth: azimuthReference,
    elevation: reference,
  }: OverheadChannelReference,
  azimuth: number,
  elevation: number,
): OverheadPlacementRangeCheck {
  const side = OVERHEAD_CHANNELS[channel].side
  const azimuthCheck =
    azimuthReference.ideal === null
      ? ungraded(azimuthReference, side, azimuth)
      : checkAzimuth(side, azimuthReference, azimuth)
  const elevationCheck = checkAngle(reference, elevation, elevation)
  return {
    grade: worst([azimuthCheck.grade, elevationCheck.grade]),
    azimuth: azimuthCheck,
    elevation: elevationCheck,
  }
}

const GRADE_ORDER = ['ideal', 'acceptable', 'outside'] as const

/** The worst of the grades given; ungraded parts (null) don't count. */
function worst(grades: readonly (PlacementGrade | null)[]): PlacementGrade {
  return GRADE_ORDER.reduce<PlacementGrade>(
    (found, grade) => (grades.includes(grade) ? grade : found),
    'ideal',
  )
}

/** An azimuth graded on the channel's own side. */
function checkAzimuth(
  side: ChannelSide,
  reference: AngleReference,
  degrees: number,
): AngleCheck {
  return checkAngle(reference, angleOnSide(side, degrees), degrees)
}

/** An azimuth Dolby gives no range for, shown on the channel's own side. */
function ungraded(
  reference: NoAngleRange,
  side: ChannelSide,
  degrees: number,
): UngradedAngle {
  const shown = Math.round(Math.abs(angleOnSide(side, degrees)))
  return { ...reference, degrees, shown, grade: null }
}

/**
 * Grade `graded` (the angle as Dolby's ranges measure it) to the nearest
 * whole degree; `measured` is the angle as measured, kept as `degrees`.
 */
function checkAngle(
  { ideal, acceptable }: AngleReference,
  graded: number,
  measured: number,
): AngleCheck {
  const shown = Math.round(Math.abs(graded))
  // Negative stays negative, so the wrong side never falls in a range.
  const rounded = graded < 0 ? -shown : shown
  const grade: PlacementGrade = isWithin(rounded, ideal.range)
    ? 'ideal'
    : acceptable.range && isWithin(rounded, acceptable.range)
      ? 'acceptable'
      : 'outside'
  return { ideal, acceptable, degrees: measured, shown, grade }
}

function isWithin(angle: number, { min, max }: AngleRange): boolean {
  return angle >= min && angle <= max
}
