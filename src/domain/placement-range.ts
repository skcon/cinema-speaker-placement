import {
  CHANNELS,
  dolbyLayoutFor,
  type AngleRange,
  type ChannelId,
  type PlacementRangeReference,
} from './dolby-layouts'
import { formatLayout, type SpeakerFormat } from './layout'

/** How a speaker's angle from the MLP compares with its placement range. */
export type PlacementGrade = 'ideal' | 'acceptable' | 'outside'

/** A speaker's placement-range check, with the range and its sources. */
export type PlacementRangeCheck = PlacementRangeReference & {
  /** The speaker's azimuth from the MLP, in degrees (src/domain/room.ts). */
  readonly azimuth: number
  /**
   * The angle from the center-front reference that was graded and is
   * shown: unsigned, to the nearest whole degree.
   */
  readonly angle: number
  readonly grade: PlacementGrade
}

/**
 * Grade a channel's azimuth against its Dolby placement range: inside the
 * ideal range is ideal, inside the wider acceptable range (L/R only) is
 * acceptable, anything else (including the wrong side of the room) is
 * outside.
 *
 * Our modelling assumption, not Dolby's: Dolby's ranges are whole degrees,
 * so the angle is graded to the nearest whole degree, the same number the
 * room view shows. It also keeps floating-point noise (a Center at
 * 1e-15°) from changing a grade.
 */
export function checkPlacementRange(
  format: SpeakerFormat,
  channel: ChannelId,
  azimuth: number,
): PlacementRangeCheck {
  const reference = dolbyLayoutFor(format).channels.find(
    (entry) => entry.channel === channel,
  )
  if (!reference) {
    const layout = formatLayout({ ...format, subwoofers: 1 })
    throw new Error(`${layout} has no ${channel} channel`)
  }
  const { ideal, acceptable } = reference
  const side = CHANNELS[channel].side
  // The angle on the channel's own side: negative when on the other side.
  const onSide =
    side === 'center' ? Math.abs(azimuth) : side === 'left' ? -azimuth : azimuth
  const angle = Math.round(Math.abs(onSide))
  const graded = onSide < 0 ? -angle : angle
  const grade: PlacementGrade = isWithin(graded, ideal.range)
    ? 'ideal'
    : acceptable.range && isWithin(graded, acceptable.range)
      ? 'acceptable'
      : 'outside'
  return { ideal, acceptable, azimuth, angle, grade }
}

function isWithin(angle: number, { min, max }: AngleRange): boolean {
  return angle >= min && angle <= max
}
