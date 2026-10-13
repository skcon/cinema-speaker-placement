/**
 * Weaknesses and strengths of the estimated response, each with its
 * likely cause in the model (issue #2, user stories 44 and 45): "length
 * mode at 43 Hz", "front-wall reflection notch at 140 Hz".
 *
 * Builds on the peak/dip summary (response-summary.ts): a weakness is a
 * peak or dip where the reliable rows leave the target's tolerance band,
 * one per stretch outside it, at its extreme. A stretch deepest at the
 * first or last reliable row is left out: its center lies outside the
 * chart, so its frequency is not known. Unreliable rows are
 * skipped. The causes are the model's own ingredients (room modes,
 * boundary reflections, the enclosure roll-off), matched by frequency, so
 * a cause is "likely", never certain. The matching rules are ours
 * (RESPONSE_NOTES in reference.ts).
 */
import type { BoundaryReflection, Surface } from './boundary-interference'
import type { HeardMode, ResponseRow } from './estimated-response'
import {
  ENCLOSURE_ROLL_OFF,
  RESPONSE_NOTES,
  SPEED_OF_SOUND,
  TARGET_TOLERANCE,
} from './reference'
import type { ResponseSummary } from './response-summary'
import type { RoomMode } from './room-modes'
import type { Enclosure } from './speaker-specs'

/** What most likely makes a peak or dip, in the model. */
export type ResponseCause =
  /** A room mode the subwoofers excite and the MLP hears. */
  | { readonly kind: 'room-mode'; readonly mode: RoomMode }
  /** A room mode the subwoofers excite, with the MLP near its node. */
  | { readonly kind: 'mode-null'; readonly mode: RoomMode }
  /** Reflections off these surfaces cancelling (notch) or adding (boost). */
  | {
      readonly kind: 'reflection'
      readonly effect: 'notch' | 'boost'
      readonly surfaces: readonly Surface[]
    }
  /** The subwoofers' enclosure rolling off the lowest bass. */
  | { readonly kind: 'enclosure-roll-off'; readonly enclosure: Enclosure }
  /** Several room modes together, none of them alone. */
  | { readonly kind: 'modes-combined' }
  /** Several reflections together, none of them alone. */
  | { readonly kind: 'reflections-combined' }

/** A peak or dip outside the tolerance band, with its likely cause. */
export type ResponseWeakness = {
  readonly kind: 'peak' | 'dip'
  /** Where it is most extreme, in Hz. */
  readonly frequency: number
  /**
   * How far it is from the target there, in dB; for a speaker's own notch,
   * from that speaker's average level.
   */
  readonly deviation: number
  readonly cause: ResponseCause
  /**
   * The speakers it belongs to, by name; empty for the chart as a whole
   * (the subwoofers' room modes, for example).
   */
  readonly speakers: readonly string[]
}

/** Something the plan gets right. */
export type ResponseStrength =
  /** Most of the reliable range is inside the tolerance band. */
  | {
      readonly kind: 'smooth'
      /** The share of reliable rows inside it, 0 to 1. */
      readonly withinTolerance: number
      readonly from: number
      readonly to: number
    }
  /** The subwoofers cancel a first-order axial mode, so it can't boom. */
  | { readonly kind: 'mode-cancelled'; readonly mode: RoomMode }
  /** These speakers have no reflection notch deeper than the tolerance. */
  | { readonly kind: 'no-deep-notch'; readonly speakers: readonly string[] }

export type ResponseNotes = {
  /** Largest deviation first. */
  readonly weaknesses: readonly ResponseWeakness[]
  readonly strengths: readonly ResponseStrength[]
}

/** A listener-level speaker's reflections, for the notes. */
export type NotedSpeaker = {
  readonly name: string
  /** Whether it is part of the chart's estimate (Left, Center and Right). */
  readonly charted: boolean
  readonly reflections: readonly BoundaryReflection[]
  /**
   * Its boundary interference level in dB at each row's frequency: the
   * same values the estimate uses (`interferenceLevels`).
   */
  readonly levels: readonly number[]
}

export type ResponseNotesInput = {
  readonly rows: readonly ResponseRow[]
  readonly summary: ResponseSummary
  readonly crossoverHz: number
  /** Every mode's half-power bandwidth, in Hz. */
  readonly modalBandwidth: number
  readonly roomModes: readonly HeardMode[]
  /** Every listener-level speaker. */
  readonly speakers: readonly NotedSpeaker[]
  /** The subwoofers' enclosures. */
  readonly enclosures: readonly Enclosure[]
}

/** The weaknesses and strengths of an estimated response. */
export function responseNotes(input: ResponseNotesInput): ResponseNotes {
  const reliable = input.rows.filter((row) => row.reliable)
  const chart = awayFromEdges(
    outsideBand(
      reliable.map((row) => ({
        frequency: row.frequency,
        deviation: row.estimated - row.target,
        above: row.estimated > row.high,
        below: row.estimated < row.low,
      })),
    ),
    reliable.map((row) => row.frequency),
  ).map((extreme) => chartWeakness(extreme, input))
  const ownNotches = speakerNotches(input)
  // The chart already covers the charted speakers; for the others, each
  // one's deepest notch, mirrored pairs as one entry.
  const deepest = ownNotches.flatMap(({ speaker, notches }) => {
    const notch = nearestBy(notches, (n) => n.deviation)
    return !speaker.charted && notch ? [notch] : []
  })
  const weaknesses = [...chart, ...mergeMirrored(deepest)].sort(
    (a, b) => Math.abs(b.deviation) - Math.abs(a.deviation),
  )
  return { weaknesses, strengths: strengths(input, ownNotches) }
}

type Deviation = {
  readonly frequency: number
  readonly deviation: number
  readonly above: boolean
  readonly below: boolean
}

/**
 * The extremes not at the first or last of `frequencies`: a stretch
 * deepest at an edge runs into it, so its center lies outside what is
 * worked out (below the reliable rows or the crossover, or above the
 * chart) and is not known.
 */
function awayFromEdges<T extends { frequency: number }>(
  extremes: readonly T[],
  frequencies: readonly number[],
): T[] {
  return extremes.filter(
    ({ frequency }) =>
      frequency !== frequencies[0] && frequency !== frequencies.at(-1),
  )
}

type Extreme = { kind: 'peak' | 'dip'; frequency: number; deviation: number }

/**
 * One extreme per stretch of consecutive rows above (a peak) or below (a
 * dip) the band.
 */
function outsideBand(deviations: readonly Deviation[]): Extreme[] {
  const extremes: Extreme[] = []
  let current: Extreme | undefined
  for (const { frequency, deviation, above, below } of deviations) {
    const kind = above ? 'peak' : below ? 'dip' : undefined
    if (kind !== current?.kind) {
      if (current) extremes.push(current)
      current = kind && { kind, frequency, deviation }
    } else if (current && Math.abs(deviation) > Math.abs(current.deviation)) {
      current = { kind: current.kind, frequency, deviation }
    }
  }
  if (current) extremes.push(current)
  return extremes
}

/** A chart peak or dip with its likely cause. */
function chartWeakness(
  extreme: Extreme,
  input: ResponseNotesInput,
): ResponseWeakness {
  const charted = input.speakers.filter((speaker) => speaker.charted)
  const byMode = () => modeCause(extreme, input)
  const byReflection = () =>
    reflectionCause(extreme.kind, extreme.frequency, charted)
  const [first, second] =
    extreme.frequency < input.crossoverHz
      ? [byMode, byReflection]
      : [byReflection, byMode]
  const found = first() ?? second()
  if (found) return { ...extreme, ...found }
  const enclosure = extreme.kind === 'dip' && rollOffCause(extreme, input)
  if (enclosure) return { ...extreme, cause: enclosure, speakers: [] }
  return {
    ...extreme,
    cause: {
      kind:
        extreme.frequency < input.crossoverHz
          ? 'modes-combined'
          : 'reflections-combined',
    },
    speakers: [],
  }
}

type FoundCause = { cause: ResponseCause; speakers: readonly string[] }

/**
 * The excited mode nearest the extreme, within the matching window: for a
 * peak one the MLP hears, for a dip one it sits near the node of.
 */
function modeCause(
  { kind, frequency }: Extreme,
  { roomModes, modalBandwidth }: ResponseNotesInput,
): FoundCause | undefined {
  const window = Math.max(
    modalBandwidth,
    RESPONSE_NOTES.matchWithin * frequency,
  )
  const candidates = roomModes.filter(
    ({ mode, excited, atReceiver }) =>
      excited &&
      Math.abs(mode.frequency - frequency) <= window &&
      (kind === 'peak'
        ? Math.abs(atReceiver) >= RESPONSE_NOTES.nodeBelow
        : Math.abs(atReceiver) < RESPONSE_NOTES.nodeBelow),
  )
  const nearest = nearestBy(candidates, ({ mode }) =>
    Math.abs(mode.frequency - frequency),
  )
  return (
    nearest && {
      cause: {
        kind: kind === 'peak' ? 'room-mode' : 'mode-null',
        mode: nearest.mode,
      },
      speakers: [],
    }
  )
}

/**
 * The speakers' reflections whose notch (for a dip) or boost (for a peak)
 * frequency is nearest the extreme, within the reflection window.
 */
function reflectionCause(
  kind: 'peak' | 'dip',
  frequency: number,
  speakers: readonly NotedSpeaker[],
): FoundCause | undefined {
  const matches = speakers.flatMap((speaker) =>
    speaker.reflections.flatMap((reflection) => {
      const distance = Math.min(
        ...characteristicFrequencies(reflection, kind).map((f) =>
          Math.abs(Math.log(f / frequency)),
        ),
      )
      return distance <= Math.log(1 + RESPONSE_NOTES.reflectionWithin)
        ? [{ speaker: speaker.name, surface: reflection.surface, distance }]
        : []
    }),
  )
  const best = nearestBy(matches, (match) => match.distance)
  if (!best) return undefined
  // Every speaker's match about as near as the best one (a mirrored pair).
  const close = matches.filter(
    (match) =>
      match.distance <=
      best.distance + Math.log(1 + RESPONSE_NOTES.mergeWithin),
  )
  return {
    cause: {
      kind: 'reflection',
      effect: kind === 'dip' ? 'notch' : 'boost',
      surfaces: unique(close.map((match) => match.surface)),
    },
    speakers: unique(close.map((match) => match.speaker)),
  }
}

/** Notch frequencies for a dip; boost frequencies k·c/Δ for a peak. */
function characteristicFrequencies(
  reflection: BoundaryReflection,
  kind: 'peak' | 'dip',
): readonly number[] {
  if (kind === 'dip') return reflection.notchFrequencies
  const c = SPEED_OF_SOUND.metersPerSecond
  return reflection.notchFrequencies.map(
    (_, k) => ((k + 1) * c) / reflection.pathDifference,
  )
}

/** The enclosure roll-off, for a dip near the bottom of the band. */
function rollOffCause(
  { frequency }: Extreme,
  { enclosures }: ResponseNotesInput,
): ResponseCause | undefined {
  const highest = nearestBy(
    enclosures,
    (enclosure) => -ENCLOSURE_ROLL_OFF[enclosure].cornerHz,
  )
  if (!highest) return undefined
  const corner = ENCLOSURE_ROLL_OFF[highest].cornerHz
  return frequency <= corner * RESPONSE_NOTES.rollOffUpTo
    ? { kind: 'enclosure-roll-off', enclosure: highest }
    : undefined
}

/** Each speaker's own reflection notches above the crossover. */
function speakerNotches({ rows, speakers, crossoverHz }: ResponseNotesInput): {
  speaker: NotedSpeaker
  notches: ResponseWeakness[]
}[] {
  const above = rows.flatMap((row, i) =>
    row.frequency >= crossoverHz ? [i] : [],
  )
  const frequencies = above.map((i) => rows[i]!.frequency)
  return speakers.map((speaker) => {
    const levels = above.map((i) => speaker.levels[i] ?? 0)
    const average =
      levels.reduce((sum, level) => sum + level, 0) / (levels.length || 1)
    const tolerance = TARGET_TOLERANCE.db
    const notches = awayFromEdges(
      outsideBand(
        levels.map((level, i) => ({
          frequency: frequencies[i]!,
          deviation: level - average,
          above: false,
          below: level - average < -tolerance,
        })),
      ),
      frequencies,
    ).map(({ frequency, deviation }): ResponseWeakness => {
      const found = reflectionCause('dip', frequency, [speaker])
      return {
        kind: 'dip',
        frequency,
        deviation,
        cause: found?.cause ?? { kind: 'reflections-combined' },
        speakers: [speaker.name],
      }
    })
    return { speaker, notches }
  })
}

/** What the plan gets right. */
function strengths(
  { summary, rows, roomModes }: ResponseNotesInput,
  ownNotches: readonly { speaker: NotedSpeaker; notches: unknown[] }[],
): ResponseStrength[] {
  const reliable = rows.filter((row) => row.reliable)
  const summarized = reliable.length > 0 ? reliable : rows
  const smooth: ResponseStrength[] =
    summary.withinTolerance >= RESPONSE_NOTES.smoothFrom && summarized[0]
      ? [
          {
            kind: 'smooth',
            withinTolerance: summary.withinTolerance,
            from: summarized[0].frequency,
            to: summarized.at(-1)!.frequency,
          },
        ]
      : []
  const cancelled = roomModes
    .filter(
      ({ mode, excited }) =>
        !excited &&
        mode.kind === 'axial' &&
        mode.indices.length + mode.indices.width + mode.indices.height === 1,
    )
    .map(({ mode }): ResponseStrength => ({ kind: 'mode-cancelled', mode }))
  const clear = ownNotches
    .filter(({ notches }) => notches.length === 0)
    .map(({ speaker }) => speaker.name)
  return [
    ...smooth,
    ...cancelled,
    ...(clear.length > 0
      ? [{ kind: 'no-deep-notch', speakers: clear } as const]
      : []),
  ]
}

/**
 * Speakers' notches at about the same frequency with the same kind of
 * cause, off the same or mirrored surfaces (Left and Right Surround off
 * the left and right walls), as one entry.
 */
function mergeMirrored(
  weaknesses: readonly ResponseWeakness[],
): ResponseWeakness[] {
  const merged: ResponseWeakness[] = []
  for (const weakness of weaknesses) {
    const index = merged.findIndex((other) => isMirrored(other, weakness))
    const other = merged[index]
    if (!other) {
      merged.push(weakness)
      continue
    }
    merged[index] = {
      ...other,
      deviation: Math.min(other.deviation, weakness.deviation),
      cause:
        other.cause.kind === 'reflection' &&
        weakness.cause.kind === 'reflection'
          ? {
              ...other.cause,
              surfaces: unique([
                ...other.cause.surfaces,
                ...weakness.cause.surfaces,
              ]),
            }
          : other.cause,
      speakers: unique([...other.speakers, ...weakness.speakers]),
    }
  }
  return merged
}

const MIRROR: Partial<Record<Surface, Surface>> = {
  'left wall': 'right wall',
  'right wall': 'left wall',
}

function isMirrored(a: ResponseWeakness, b: ResponseWeakness): boolean {
  if (a.kind !== b.kind || a.cause.kind !== b.cause.kind) return false
  if (
    Math.abs(Math.log(a.frequency / b.frequency)) >
    Math.log(1 + RESPONSE_NOTES.mergeWithin)
  ) {
    return false
  }
  if (a.cause.kind !== 'reflection' || b.cause.kind !== 'reflection') {
    // The same kind of cause, not from one surface.
    return true
  }
  const bSurfaces = b.cause.surfaces
  return a.cause.surfaces.every((surface) =>
    bSurfaces.some((other) => other === surface || MIRROR[surface] === other),
  )
}

function nearestBy<T>(
  items: readonly T[],
  distance: (item: T) => number,
): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) =>
      best === undefined || distance(item) < distance(best) ? item : best,
    undefined,
  )
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)]
}
