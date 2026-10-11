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

const CENTIMETERS_PER_METER = 100

/** Imperial lengths are shown to the nearest tenth of an inch (2.54 mm). */
const INCH_TENTHS_PER_INCH = 10
const INCH_TENTHS_PER_FOOT = INCHES_PER_FOOT * INCH_TENTHS_PER_INCH

export function feetAndInchesToMeters({ feet, inches }: FeetAndInches): number {
  return (feet * INCHES_PER_FOOT + inches) * METERS_PER_INCH
}

/**
 * Whole feet plus inches rounded to the nearest 0.1 in. Rounding happens on
 * the total, so 11.96 in becomes 1 ft 0 in rather than 0 ft 12 in.
 */
export function metersToFeetAndInches(meters: number): FeetAndInches {
  const tenths = Math.round((meters / METERS_PER_INCH) * INCH_TENTHS_PER_INCH)
  const feet = Math.floor(tenths / INCH_TENTHS_PER_FOOT)
  const inches = (tenths - feet * INCH_TENTHS_PER_FOOT) / INCH_TENTHS_PER_INCH
  return { feet, inches }
}

/** Metric lengths are shown to the nearest centimeter. */
export function roundToCentimeters(meters: number): number {
  return Math.round(meters * CENTIMETERS_PER_METER) / CENTIMETERS_PER_METER
}

/** A length as text in the chosen units, for example "4.5 m" or "14 ft 9.2 in". */
export function formatLength(meters: number, units: UnitSystem): string {
  if (units === 'metric') return `${roundToCentimeters(meters)} m`
  const { feet, inches } = metersToFeetAndInches(meters)
  return `${feet} ft ${inches} in`
}
