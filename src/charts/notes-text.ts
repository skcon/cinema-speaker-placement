/**
 * The response notes (weaknesses and strengths) in words. Wording only:
 * the domain finds the notes and their causes.
 */
import { formatDb, formatHz, formatHzRange } from '@/charts/format'
import {
  TARGET_TOLERANCE,
  type ResponseCause,
  type ResponseStrength,
  type ResponseWeakness,
  type RoomMode,
  type Surface,
} from '@/domain'

const ORDINALS = ['first', 'second', 'third', 'fourth'] as const

/** "first length mode", "tangential mode (1, 1, 0)". */
function modeName({ indices, kind }: RoomMode): string {
  if (kind === 'axial') {
    const [dimension, order] = (
      Object.entries(indices) as [keyof typeof indices, number][]
    ).find(([, n]) => n > 0)!
    const ordinal = ORDINALS[order - 1]
    return ordinal
      ? `${ordinal} ${dimension} mode`
      : `${dimension} mode of order ${order}`
  }
  return `${kind} mode (${indices.length}, ${indices.width}, ${indices.height})`
}

/** "Left", "Left and Right", "Left, Center and Right". */
function namesList(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/** "front-wall", "side-wall", "floor and front-wall". */
function surfacesText(surfaces: readonly Surface[]): string {
  const sides =
    surfaces.includes('left wall') && surfaces.includes('right wall')
  const named = sides
    ? [
        ...surfaces.filter((s) => s !== 'left wall' && s !== 'right wall'),
        'side wall',
      ]
    : surfaces
  return namesList(named.map((surface) => surface.replace(' ', '-')))
}

function causeText(cause: ResponseCause): string {
  switch (cause.kind) {
    case 'room-mode':
      return `the ${modeName(cause.mode)} at ${formatHz(cause.mode.frequency)}`
    case 'mode-null':
      return `the MLP near a null of the ${modeName(cause.mode)} at ${formatHz(cause.mode.frequency)}`
    case 'reflection':
      return `a ${surfacesText(cause.surfaces)} reflection ${cause.effect}`
    case 'enclosure-roll-off':
      return `the ${cause.enclosure} subwoofers’ roll-off`
    case 'modes-combined':
      return 'several room modes together'
    case 'reflections-combined':
      return 'several reflections together'
  }
}

/** "Dip at 140 Hz (−8.2 dB): likely a front-wall reflection notch (Left and Right)." */
export function weaknessText(weakness: ResponseWeakness): string {
  const kind = weakness.kind === 'peak' ? 'Peak' : 'Dip'
  const speakers =
    weakness.speakers.length > 0 ? ` (${namesList(weakness.speakers)})` : ''
  return (
    `${kind} at ${formatHz(weakness.frequency)} (${formatDb(weakness.deviation)}): ` +
    `likely ${causeText(weakness.cause)}${speakers}.`
  )
}

export function strengthText(strength: ResponseStrength): string {
  switch (strength.kind) {
    case 'smooth':
      return (
        `Smooth: within ±${TARGET_TOLERANCE.db} dB over ` +
        `${Math.round(strength.withinTolerance * 100)}% of ` +
        `${formatHzRange(strength.from, strength.to)}.`
      )
    case 'mode-cancelled':
      return `The subwoofers cancel the ${modeName(strength.mode)} (${formatHz(strength.mode.frequency)}).`
    case 'no-deep-notch':
      return `No reflection notch deeper than ${TARGET_TOLERANCE.db} dB: ${namesList(strength.speakers)}.`
  }
}
