/**
 * Complex numbers for acoustic transfer functions: a pressure with its
 * magnitude and phase, so that sources can be summed coherently and later
 * filters (enclosure roll-off, crossover, #12) multiplied in.
 */
export type Complex = { readonly re: number; readonly im: number }

/** The level of a pressure in dB (re 1): 20·log10|p|. */
export function decibels({ re, im }: Complex): number {
  return 20 * Math.log10(Math.hypot(re, im))
}
