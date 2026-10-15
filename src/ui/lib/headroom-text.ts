/**
 * Plain-language headroom text (user stories 47 and 58): wording and
 * rounding only. Every number, the reference levels and thresholds among
 * them, comes from the domain's headroom estimate.
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

/** "1.0 dB", one decimal, unsigned. */
function db(value: number): string {
  return `${Math.abs(value).toFixed(1)} dB`
}

/** Watts rounded up to a figure worth buying: "250 W", "1,300 W". */
function roundWatts(watts: number): string {
  const step = watts < 100 ? 5 : watts < 1000 ? 10 : 100
  return formatWatts(Math.ceil(watts / step) * step)
}

/** What a group's sentence is written from. */
type GroupFacts = {
  headroom: string
  at: string
  where: string
  watts: string
  enough: string
}

/** What the subwoofers' sentence is written from. */
type SubwooferFacts = {
  /** "It has" / "Together they have", and so on, per verb. */
  subject: (one: string, several: string) => string
  headroom: string
  target: string
}

/**
 * Per status: its word and color (the room view's grade colors), and the
 * sentence templates for a speaker group and for the subwoofers.
 */
export const HEADROOM_STATUS_TEXT = {
  enough: {
    label: 'Enough',
    color: '#16a34a',
    group: ({ headroom, at, where }: GroupFacts) =>
      `About ${headroom} to spare at ${at}.${where}`,
    subwoofers: ({ subject, headroom, target }: SubwooferFacts) =>
      `${subject('It has', 'Together they have')} about ${headroom} to spare over ${target}.`,
  },
  tight: {
    label: 'Tight',
    color: '#d97706',
    group: ({ headroom, at, where, watts, enough }: GroupFacts) =>
      `Just reaches reference peaks at ${at}, with ${headroom} to spare.` +
      `${where} About ${watts} per channel would leave ${enough}.`,
    subwoofers: ({ subject, headroom, target }: SubwooferFacts) =>
      `${subject('It just reaches', 'Together they just reach')} ${target}, with ${headroom} to spare.`,
  },
  short: {
    label: 'Short',
    color: '#dc2626',
    group: ({ headroom, at, where, watts, enough }: GroupFacts) =>
      `About ${headroom} short of reference peaks at ${at}.${where} About ` +
      `${watts} per channel, or more sensitive speakers, would leave ${enough} to spare.`,
    subwoofers: ({ subject, headroom, target }: SubwooferFacts) =>
      `${subject('It falls', 'Together they fall')} about ${headroom} short of ${target}; ` +
      'more or larger subwoofers, or more power, would help.',
  },
} as const satisfies Record<
  HeadroomStatus,
  {
    label: string
    color: string
    group: (facts: GroupFacts) => string
    subwoofers: (facts: SubwooferFacts) => string
  }
>

/** What the speakers and subwoofers are checked against, in one sentence. */
export function referenceSentence({
  referencePeakDb,
  referenceLevelDb,
  peakAboveReferenceDb,
  lfeGainDb,
  subwoofers,
}: HeadroomAnalysis): string {
  return (
    `Can each speaker reach reference peaks of ${referencePeakDb} dB at the ` +
    `MLP (Dolby’s home reference level, ${referenceLevelDb} dB, plus ` +
    `${peakAboveReferenceDb} dB), and the subwoofers ${subwoofers.targetDb} dB ` +
    `(the LFE channel plays ${lfeGainDb} dB louder)?`
  )
}

/** A speaker group's headroom in a sentence, with what would help. */
export function groupSentence(
  row: GroupHeadroom,
  { amplifierWatts, enoughFromDb }: HeadroomAnalysis,
  units: UnitSystem,
): string {
  const { weakest, channels, status, headroomDb, wattsForEnough } = row
  const distance = formatLength(weakest.distance, units)
  return HEADROOM_STATUS_TEXT[status].group({
    headroom: db(headroomDb),
    at: formatWatts(amplifierWatts),
    where:
      channels.length > 1
        ? ` The weakest, ${weakest.name}, is ${distance} away.`
        : ` It is ${distance} away.`,
    watts: roundWatts(wattsForEnough),
    enough: db(enoughFromDb),
  })
}

/** The subwoofers' rough headroom in a sentence, honest about how rough. */
export function subwooferSentence({
  status,
  headroomDb,
  targetDb,
  subwoofers,
}: SubwooferHeadroom): string {
  const several = subwoofers.length > 1
  return (
    HEADROOM_STATUS_TEXT[status].subwoofers({
      subject: (one, many) => (several ? many : one),
      headroom: db(headroomDb),
      target: `${targetDb} dB`,
    }) +
    ' Very rough: the sensitivity is our guess from driver size and ' +
    'enclosure, and it uses RMS power on purpose (peak power isn’t used ' +
    'yet, the conservative choice), without room gain.'
  )
}
