/**
 * Unit conversion for the UI edge. The domain works in SI (meters); imperial
 * lengths are feet + inches and exist only for input and display.
 */

/** The international foot (exact). */
export const METERS_PER_FOOT = 0.3048
/** The international inch (exact). */
export const METERS_PER_INCH = 0.0254
export const INCHES_PER_FOOT = 12

/** The units lengths are entered and shown in. Metric is the default. */
export type UnitSystem = 'metric' | 'imperial'

/** An imperial length split into whole feet and the remaining inches. */
export type FeetAndInches = { feet: number; inches: number }

/**
 * How to round to the display step. `up` and `down` keep a shown limit
 * inside its range (a 2 m minimum shows as 6 ft 6.8 in, not 6 ft 6.7 in).
 */
export type Rounding = 'nearest' | 'up' | 'down'

const CENTIMETERS_PER_METER = 100
/** Imperial lengths are shown to the nearest tenth of an inch (2.54 mm). */
const INCH_TENTHS_PER_INCH = 10
const INCH_TENTHS_PER_FOOT = INCHES_PER_FOOT * INCH_TENTHS_PER_INCH
/** Floating-point slack, in display steps, so on-step values stay put. */
const STEP_EPSILON = 1e-9

/** Round a value counted in display steps to a whole number of steps. */
function roundSteps(steps: number, rounding: Rounding): number {
  if (rounding === 'up') return Math.ceil(steps - STEP_EPSILON)
  if (rounding === 'down') return Math.floor(steps + STEP_EPSILON)
  return Math.round(steps)
}

export function feetAndInchesToMeters({ feet, inches }: FeetAndInches): number {
  return (feet * INCHES_PER_FOOT + inches) * METERS_PER_INCH
}

/**
 * Whole feet plus inches to 0.1 in. Rounding happens on the total, so
 * 11.96 in becomes 1 ft 0 in rather than 0 ft 12 in.
 */
export function metersToFeetAndInches(
  meters: number,
  rounding: Rounding = 'nearest',
): FeetAndInches {
  const tenths = roundSteps(
    (meters / METERS_PER_INCH) * INCH_TENTHS_PER_INCH,
    rounding,
  )
  const feet = Math.floor(tenths / INCH_TENTHS_PER_FOOT)
  const inches = (tenths - feet * INCH_TENTHS_PER_FOOT) / INCH_TENTHS_PER_INCH
  return { feet, inches }
}

/** Metric lengths are shown to the centimeter. */
export function roundToCentimeters(
  meters: number,
  rounding: Rounding = 'nearest',
): number {
  return (
    roundSteps(meters * CENTIMETERS_PER_METER, rounding) / CENTIMETERS_PER_METER
  )
}

/** A length as text in the chosen units, for example "4.5 m" or "14 ft 9.2 in". */
export function formatLength(
  meters: number,
  units: UnitSystem,
  rounding: Rounding = 'nearest',
): string {
  if (units === 'metric') return `${roundToCentimeters(meters, rounding)} m`
  const { feet, inches } = metersToFeetAndInches(meters, rounding)
  return `${feet} ft ${inches} in`
}
