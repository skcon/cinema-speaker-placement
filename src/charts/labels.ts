import { RESPONSE_BAND, type TargetCurveKind } from '@/domain'

/** The response band as the chart names it: "20–200 Hz". */
export const RESPONSE_BAND_LABEL = `${RESPONSE_BAND.lowestHz}–${RESPONSE_BAND.highestHz} Hz`

/** The target curve picker's options. */
export const TARGET_CURVE_OPTIONS = [
  { value: 'flat', label: 'Flat' },
  { value: 'house', label: 'House curve (our assumption)' },
] as const satisfies readonly { value: TargetCurveKind; label: string }[]

/** How a sentence names the target curve: "the flat target", "the house curve". */
export function targetName(kind: TargetCurveKind): string {
  return kind === 'flat' ? 'flat target' : 'house curve'
}
