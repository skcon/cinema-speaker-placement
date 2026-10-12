/**
 * Complex numbers for acoustic transfer functions: a pressure with its
 * magnitude and phase, so that sources can be summed coherently and later
 * filters (enclosure roll-off, crossover, #12) multiplied in.
 */
export type Complex = { readonly re: number; readonly im: number }

export const ZERO: Complex = { re: 0, im: 0 }

export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}

export function multiply(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

/** The level of a pressure in dB (re 1): 20·log10|p|. */
export function decibels({ re, im }: Complex): number {
  return 20 * Math.log10(Math.hypot(re, im))
}
