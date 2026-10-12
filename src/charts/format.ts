/** Display formatting for the response chart: rounding only, no acoustics. */

/** "28.6" or "20" below 100 Hz, "142" from 100 Hz. */
function hzNumber(frequency: number): string {
  return String(
    frequency < 100 ? Number(frequency.toFixed(1)) : Math.round(frequency),
  )
}

/** "28.6 Hz" or "20 Hz" below 100 Hz, "142 Hz" from 100 Hz. */
export function formatHz(frequency: number): string {
  return `${hzNumber(frequency)} Hz`
}

/** "28.6–200 Hz". */
export function formatHzRange(low: number, high: number): string {
  return `${hzNumber(low)}–${hzNumber(high)} Hz`
}

/** A signed level with a true minus sign: "+6.9 dB", "−8.2 dB", "0.0 dB". */
export function formatDb(level: number): string {
  const rounded = Number(level.toFixed(1))
  if (rounded === 0) return '0.0 dB'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)} dB`
}
