/**
 * Plain-language explanations of a speaker's placement-range grade: the
 * measured angle, the ranges it was graded against, what each grade
 * means, and where each range comes from. Wording only: every range,
 * note and citation comes from the domain's reference data.
 */
import {
  sourceOf,
  SUBWOOFER_NO_RANGE,
  type UngradedAngle,
  type AngleCheck,
  type Citation,
  type PlacementGrade,
  type PlacementGrading,
} from '@/domain'

/** One range an angle was graded against, with its sources. */
export type RangeExplanation = {
  readonly name: 'Ideal range' | 'Acceptable range'
  /** For example "22–30°", or null where Dolby gives no such range. */
  readonly range: string | null
  readonly sources: readonly FormattedCitation[]
  /** What the sources say about it (a conflict, say), or why there is none. */
  readonly note: string | null
  /** Where the range is our modelling assumption rather than Dolby's. */
  readonly assumption: string | null
}

/** One measured angle of a speaker and the ranges it was graded against. */
export type AngleExplanation = {
  readonly name: 'Angle' | 'Elevation'
  /** How the angle is measured, in words. */
  readonly measuredAs: string
  /** Its grade, or null when Dolby gives no range for it. */
  readonly grade: PlacementGrade | null
  /** The angle and its grade, for example "29°, ideal". */
  readonly reading: string
  readonly ranges: readonly RangeExplanation[]
  /** Why the angle is not graded, or null. */
  readonly note: string | null
}

/** A speaker's grade explained, or why a subwoofer has none. */
export type GradeExplanation =
  | {
      readonly graded: true
      readonly grade: PlacementGrade
      readonly angles: readonly AngleExplanation[]
    }
  | {
      readonly graded: false
      readonly reason: string
      readonly sources: readonly FormattedCitation[]
    }

/** What each grade means, in plain words. */
export const GRADE_MEANINGS = [
  {
    grade: 'ideal',
    name: 'Ideal',
    meaning: 'inside the range Dolby recommends for this speaker.',
  },
  {
    grade: 'acceptable',
    name: 'Acceptable',
    meaning:
      'outside the recommended range, but inside a wider range Dolby also shows.',
  },
  {
    grade: 'outside',
    name: 'Outside',
    meaning:
      'outside every range Dolby gives for this speaker. Move the speaker or the MLP to bring it back in.',
  },
] as const satisfies readonly {
  grade: PlacementGrade
  name: string
  meaning: string
}[]

const MEASURED_AS = {
  Angle:
    'From the MLP, from straight ahead at the screen, on the speaker’s own side.',
  Elevation:
    'From the MLP, seen from the side: 0° straight ahead, 90° overhead, 180° straight behind.',
} as const

/** A placed speaker's grade in words, with every range and its sources. */
export function explainGrade(grading: PlacementGrading): GradeExplanation {
  switch (grading.kind) {
    case 'speaker': {
      const { grade, azimuth } = grading.check
      return { graded: true, grade, angles: [explainAngle('Angle', azimuth)] }
    }
    case 'overhead': {
      const { grade, azimuth, elevation } = grading.check
      return {
        graded: true,
        grade,
        angles: [
          azimuth.grade === null
            ? explainUngradedAngle(azimuth)
            : explainAngle('Angle', azimuth),
          explainAngle('Elevation', elevation),
        ],
      }
    }
    case 'subwoofer':
      return {
        graded: false,
        reason: SUBWOOFER_NO_RANGE.note,
        sources: SUBWOOFER_NO_RANGE.citations.map(formatCitation),
      }
  }
}

/** An angle Dolby gives no range for: shown, with why it isn't graded. */
function explainUngradedAngle({
  shown,
  note,
}: UngradedAngle): AngleExplanation {
  return {
    name: 'Angle',
    measuredAs: MEASURED_AS.Angle,
    grade: null,
    reading: `${shown}°, not graded`,
    ranges: [],
    note,
  }
}

function explainAngle(
  name: AngleExplanation['name'],
  { shown, grade, ideal, acceptable }: AngleCheck,
): AngleExplanation {
  return {
    name,
    measuredAs: MEASURED_AS[name],
    grade,
    reading: `${shown}°, ${grade}`,
    ranges: [
      {
        name: 'Ideal range',
        range: formatRange(ideal.range),
        sources: ideal.citations.map(formatCitation),
        note: ideal.note ?? null,
        assumption: ideal.assumption ?? null,
      },
      acceptable.range === null
        ? {
            name: 'Acceptable range',
            range: null,
            sources: [],
            note: acceptable.note,
            assumption: null,
          }
        : {
            name: 'Acceptable range',
            range: formatRange(acceptable.range),
            sources: acceptable.citations.map(formatCitation),
            note: acceptable.note ?? null,
            assumption: acceptable.assumption ?? null,
          },
    ],
    note: null,
  }
}

/** "22–30°", or "0°" for a single angle. */
function formatRange({ min, max }: { min: number; max: number }): string {
  return min === max ? `${min}°` : `${min}–${max}°`
}

/** A citation as the app shows it: the source's title, a link, and where in it. */
export type FormattedCitation = {
  readonly title: string
  /** The source's URL, or null when there is none to link. */
  readonly url: string | null
  /** The page, figure and note, for example "p.8, fig.2", or null. */
  readonly detail: string | null
}

/**
 * A citation in words. A note that is itself a page span ("pp.27–28")
 * replaces the first page; any other note follows the page after a colon.
 */
export function formatCitation(citation: Citation): FormattedCitation {
  if ('generalReference' in citation) {
    return {
      title: `General acoustics reference ${citation.generalReference} in our research notes`,
      url: null,
      detail: citation.note ?? null,
    }
  }
  const { source, page, figure, note } = citation
  const found = sourceOf(source)
  const pageSpan = note?.startsWith('pp.') ? note : undefined
  const where = [
    pageSpan ?? (page === undefined ? undefined : `p.${page}`),
    figure,
  ].filter((part) => part !== undefined)
  const extra = pageSpan ? undefined : note
  const detail =
    where.length === 0
      ? (extra ?? null)
      : extra
        ? `${where.join(', ')}: ${extra}`
        : where.join(', ')
  return { title: found?.title ?? source, url: found?.url ?? null, detail }
}
