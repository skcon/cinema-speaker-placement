/** Display formatting for the response chart: rounding only, no acoustics. */

/** "28.6 Hz" below 100 Hz, "142 Hz" from 100 Hz. */
export function formatHz(frequency: number): string {
  return `${frequency < 100 ? frequency.toFixed(1) : Math.round(frequency)} Hz`
}

/** A signed level with a true minus sign: "+6.9 dB", "−8.2 dB", "0.0 dB". */
export function formatDb(level: number): string {
  const rounded = Number(level.toFixed(1))
  if (rounded === 0) return '0.0 dB'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)} dB`
}
