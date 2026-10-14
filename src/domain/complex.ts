/**
 * Complex numbers for acoustic transfer functions: a pressure with its
 * magnitude and phase, so that sources can be summed coherently and later
 * filters (enclosure roll-off, crossover) multiplied in.
 */
export type Complex = { readonly re: number; readonly im: number }

/** The level of a pressure in dB (re 1): 20·log10|p|. */
export function decibels({ re, im }: Complex): number {
  return 20 * Math.log10(Math.hypot(re, im))
}

/** a + b. */
export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}

/** a · b. */
export function multiply(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

/** a / b. */
export function divide(a: Complex, b: Complex): Complex {
  const scale = b.re * b.re + b.im * b.im
  return {
    re: (a.re * b.re + a.im * b.im) / scale,
    im: (a.im * b.re - a.re * b.im) / scale,
  }
}

/** |p|. */
export function magnitude({ re, im }: Complex): number {
  return Math.hypot(re, im)
}

/** A real number times a complex one. */
export function scale(factor: number, { re, im }: Complex): Complex {
  return { re: factor * re, im: factor * im }
}

/** e^(jθ): unit magnitude, phase θ in radians. */
export function phasor(radians: number): Complex {
  return { re: Math.cos(radians), im: Math.sin(radians) }
}
