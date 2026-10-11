import {
  angleOnSide,
  CHANNELS,
  type AngleRange,
  type AngleReference,
  type ChannelReference,
  type ChannelSide,
} from './dolby-layouts'

/** How a speaker's angle from the MLP compares with its placement range. */
export type PlacementGrade = 'ideal' | 'acceptable' | 'outside'

/** One angle of a speaker, graded against Dolby's ranges for it. */
export type AngleCheck = AngleReference & {
  /** The measured angle in degrees; an azimuth is signed (src/domain/room.ts). */
  readonly degrees: number
  /**
   * The angle that was graded and is shown: on the channel's own side,
   * unsigned, to the nearest whole degree.
   */
  readonly shown: number
  readonly grade: PlacementGrade
}

/** A speaker's placement-range check, one part per angle, with the ranges and their sources. */
export type PlacementRangeCheck = {
  /** The worst grade of the parts. Only the azimuth is graded until overheads (#8) add elevation. */
  readonly grade: PlacementGrade
  readonly azimuth: AngleCheck
}

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
  const azimuthCheck = checkAngle(CHANNELS[channel].side, reference, azimuth)
  return { grade: azimuthCheck.grade, azimuth: azimuthCheck }
}

function checkAngle(
  side: ChannelSide,
  { ideal, acceptable }: AngleReference,
  degrees: number,
): AngleCheck {
  const sideAngle = angleOnSide(side, degrees)
  const shown = Math.round(Math.abs(sideAngle))
  // Negative stays negative, so the wrong side never falls in a range.
  const roundedSideAngle = sideAngle < 0 ? -shown : shown
  const grade: PlacementGrade = isWithin(roundedSideAngle, ideal.range)
    ? 'ideal'
    : acceptable.range && isWithin(roundedSideAngle, acceptable.range)
      ? 'acceptable'
      : 'outside'
  return { ideal, acceptable, degrees, shown, grade }
}

function isWithin(angle: number, { min, max }: AngleRange): boolean {
  return angle >= min && angle <= max
}
