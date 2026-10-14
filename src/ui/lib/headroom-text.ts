/**
 * Plain-language headroom text (user stories 47 and 58): wording and
 * rounding only, the numbers come from the domain's headroom estimate.
 */
import {
  formatLength,
  type GroupHeadroom,
  type HeadroomAnalysis,
  type HeadroomStatus,
  type SubwooferHeadroom,
  type UnitSystem,
} from '@/domain'
import { formatWatts } from '@/ui/lib/subwoofer-specs'

/** How each status is shown: a word and the room view's grade colors. */
export const HEADROOM_STATUS_STYLES = {
  enough: { label: 'Enough', color: '#16a34a' },
  tight: { label: 'Tight', color: '#d97706' },
  short: { label: 'Short', color: '#dc2626' },
} as const satisfies Record<HeadroomStatus, { label: string; color: string }>

/** "1.0 dB", one decimal, unsigned. */
function db(value: number): string {
  return `${Math.abs(value).toFixed(1)} dB`
}

/** Watts rounded to a figure worth buying: "250 W", "1,300 W". */
function roundWatts(watts: number): string {
  const step = watts < 100 ? 5 : watts < 1000 ? 10 : 100
  return formatWatts(Math.ceil(watts / step) * step)
}

/** What the speakers are checked against, in one sentence. */
export function referenceSentence({
  referencePeakDb,
  subwoofers,
}: HeadroomAnalysis): string {
  return (
    `Can each speaker reach reference peaks of ${referencePeakDb} dB at the MLP ` +
    `(Dolby’s home calibration level plus 20 dB), and the subwoofers ` +
    `${subwoofers.targetDb} dB (the LFE channel plays 10 dB louder)?`
  )
}

/** A speaker group's headroom in a sentence, with what would help. */
export function groupSentence(
  { status, headroomDb, channels, wattsForEnough }: GroupHeadroom,
  amplifierWatts: number,
  units: UnitSystem,
): string {
  const weakest = channels.reduce((a, b) =>
    b.headroomDb < a.headroomDb ? b : a,
  )
  const distance = formatLength(weakest.distance, units)
  const where =
    channels.length > 1
      ? ` The weakest, ${weakest.name}, is ${distance} away.`
      : ` It is ${distance} away.`
  const at = formatWatts(amplifierWatts)
  switch (status) {
    case 'enough':
      return `About ${db(headroomDb)} to spare at ${at}.${where}`
    case 'tight':
      return (
        `Just reaches reference peaks at ${at}, with ${db(headroomDb)} to spare.` +
        `${where} About ${roundWatts(wattsForEnough)} per channel would leave 3 dB.`
      )
    case 'short':
      return (
        `About ${db(headroomDb)} short of reference peaks at ${at}.${where} ` +
        `About ${roundWatts(wattsForEnough)} per channel, or more sensitive ` +
        `speakers, would leave 3 dB to spare.`
      )
  }
}

/** The subwoofers' rough headroom in a sentence, with what would help. */
export function subwooferSentence({
  status,
  headroomDb,
  targetDb,
  subwoofers,
}: SubwooferHeadroom): string {
  const several = subwoofers.length > 1
  const rough =
    ' Very rough: the sensitivity is our guess from driver size and ' +
    'enclosure, at RMS power, without room gain.'
  switch (status) {
    case 'enough':
      return (
        `${several ? 'Together they have' : 'It has'} about ${db(headroomDb)} ` +
        `to spare over ${targetDb} dB.${rough}`
      )
    case 'tight':
      return (
        `${several ? 'Together they just reach' : 'It just reaches'} ` +
        `${targetDb} dB, with ${db(headroomDb)} to spare.${rough}`
      )
    case 'short':
      return (
        `${several ? 'Together they fall' : 'It falls'} about ` +
        `${db(headroomDb)} short of ${targetDb} dB; more or larger ` +
        `subwoofers, or more power, would help.${rough}`
      )
  }
}
