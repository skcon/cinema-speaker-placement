/**
 * SPL headroom at the MLP (issue #2, user stories 15, 16, 18 and 47): how
 * far above the reference peak level each Speaker and the Subwoofers can
 * play there, estimated from sensitivity, amplifier power and distance.
 *
 * A rough free-field estimate (HEADROOM_MODEL, SUBWOOFER_SENSITIVITY in
 * reference.ts): it leaves out room gain, power compression and the real
 * speakers' dispersion, so it is a hint at whether gear is underpowered,
 * never a measurement.
 */
import {
  HEADROOM_MODEL,
  HEADROOM_STATUS,
  SUBWOOFER_SENSITIVITY,
} from './reference'
import type { SubwooferSpecs } from './speaker-specs'
import { fromInches } from './units'

/**
 * The SPL a speaker gives at `distance` meters on its axis with `watts`
 * into it: sensitivity (dB SPL at 1 W, 1 m) + 10·log10(P) − 20·log10(d).
 * Nearer than HEADROOM_MODEL.minDistance counts as that distance.
 */
export function splAtDistance({
  sensitivity,
  watts,
  distance,
}: {
  sensitivity: number
  watts: number
  distance: number
}): number {
  const d = Math.max(distance, HEADROOM_MODEL.minDistance)
  return sensitivity + 10 * Math.log10(watts) - 20 * Math.log10(d)
}

/**
 * Levels in dB added up as a power sum: 10·log10(Σ 10^(L/10)). Two equal
 * levels give 3 dB more.
 */
export function sumLevels(levels: readonly number[]): number {
  return 10 * Math.log10(levels.reduce((sum, l) => sum + 10 ** (l / 10), 0))
}

/**
 * The power that turns `headroomDb` at `watts` into `wantedDb`: every 3 dB
 * more takes twice the power.
 */
export function wattsForHeadroom({
  watts,
  headroomDb,
  wantedDb,
}: {
  watts: number
  headroomDb: number
  wantedDb: number
}): number {
  return watts * 10 ** ((wantedDb - headroomDb) / 10)
}

/** Whether a headroom is comfortable, just enough, or falls short. */
export type HeadroomStatus = 'enough' | 'tight' | 'short'

/** The status of a headroom in dB (HEADROOM_STATUS thresholds). */
export function headroomStatus(headroomDb: number): HeadroomStatus {
  if (headroomDb >= HEADROOM_STATUS.enoughFromDb) return 'enough'
  if (headroomDb >= HEADROOM_STATUS.tightFromDb) return 'tight'
  return 'short'
}

/**
 * A very rough 1 W / 1 m sensitivity for a subwoofer from its driver size
 * and enclosure (SUBWOOFER_SENSITIVITY: our assumption, not a cited value).
 */
export function subwooferSensitivity({
  enclosure,
  driverDiameter,
}: Pick<SubwooferSpecs, 'enclosure' | 'driverDiameter'>): number {
  const { referenceDiameterInches, sealedDb, portedGainDb } =
    SUBWOOFER_SENSITIVITY
  const area =
    20 * Math.log10(driverDiameter / fromInches(referenceDiameterInches))
  return sealedDb + area + (enclosure === 'ported' ? portedGainDb : 0)
}
