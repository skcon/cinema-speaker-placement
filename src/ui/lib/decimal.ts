const DECIMAL = /^(\d+([.,]\d*)?|[.,]\d+)$/

/**
 * A non-negative decimal number as typed into a field; accepts a decimal
 * comma. NaN for anything else, including an empty field.
 */
export function parseDecimal(text: string): number {
  const trimmed = text.trim()
  return DECIMAL.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN
}
