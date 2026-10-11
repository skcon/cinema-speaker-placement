/**
 * Unit systems for the UI edge. The domain works in SI (meters); imperial
 * lengths are feet + inches and exist only for input and display. Each unit
 * system is described once, in UNIT_SYSTEMS, so callers never branch on it.
 */

/** The unit systems, listed once: the type, UNIT_SYSTEMS and the config schema follow it. */
export const UNIT_SYSTEM_NAMES = ['metric', 'imperial'] as const

/** The units lengths are entered and shown in. Metric is the default. */
export type UnitSystem = (typeof UNIT_SYSTEM_NAMES)[number]

/** A unit a length is written in. */
export type LengthUnit = 'm' | 'ft' | 'in'

/** One part of a written length, such as "8.2 in" in 19 ft 8.2 in. */
export type LengthPart = { unit: LengthUnit; value: number }

/**
 * How to round to the display step. `up` and `down` keep a shown limit
 * inside its range (a 2 m minimum shows as 6 ft 6.8 in, not 6 ft 6.7 in).
 */
export type Rounding = 'nearest' | 'up' | 'down'

/** How a unit system writes lengths. */
export type UnitSystemSpec = {
  /** The units a length is split into, largest first: one input box each. */
  readonly parts: readonly LengthUnit[]
  /** The largest unit and its length in meters (1 m or 1 ft). */
  readonly baseUnit: { readonly unit: LengthUnit; readonly meters: number }
  /** A length as its parts, rounded to the display step (1 cm or 0.1 in). */
  toParts(meters: number, rounding?: Rounding): LengthPart[]
  /** The length, in meters, of one value per entry of `parts`. */
  fromParts(values: readonly number[]): number
}

/** The international foot and inch (exact). */
const METERS_PER_FOOT = 0.3048
const METERS_PER_INCH = 0.0254
const INCHES_PER_FOOT = 12

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

export const UNIT_SYSTEMS: Record<UnitSystem, UnitSystemSpec> = {
  metric: {
    parts: ['m'],
    baseUnit: { unit: 'm', meters: 1 },
    toParts: (meters, rounding = 'nearest') => [
      {
        unit: 'm',
        value:
          roundSteps(meters * CENTIMETERS_PER_METER, rounding) /
          CENTIMETERS_PER_METER,
      },
    ],
    fromParts: ([meters = Number.NaN]) => meters,
  },
  imperial: {
    parts: ['ft', 'in'],
    baseUnit: { unit: 'ft', meters: METERS_PER_FOOT },
    // Rounding happens on the total, so 11.96 in becomes 1 ft 0 in, not
    // 0 ft 12 in.
    toParts: (meters, rounding = 'nearest') => {
      const tenths = roundSteps(
        (meters / METERS_PER_INCH) * INCH_TENTHS_PER_INCH,
        rounding,
      )
      const feet = Math.floor(tenths / INCH_TENTHS_PER_FOOT)
      const inches =
        (tenths - feet * INCH_TENTHS_PER_FOOT) / INCH_TENTHS_PER_INCH
      return [
        { unit: 'ft', value: feet },
        { unit: 'in', value: inches },
      ]
    },
    fromParts: ([feet = Number.NaN, inches = Number.NaN]) =>
      (feet * INCHES_PER_FOOT + inches) * METERS_PER_INCH,
  },
}

/** A length as text in the chosen units, for example "4.5 m" or "14 ft 9.2 in". */
export function formatLength(
  meters: number,
  units: UnitSystem,
  rounding: Rounding = 'nearest',
): string {
  return UNIT_SYSTEMS[units]
    .toParts(meters, rounding)
    .map(({ unit, value }) => `${value} ${unit}`)
    .join(' ')
}
