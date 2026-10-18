import type { TextCodec } from '@/ui/lib/use-draft-field'

const DECIMAL = /^(\d+([.,]\d*)?|[.,]\d+)$/

/**
 * A non-negative decimal number as typed into a field; accepts a decimal
 * comma. NaN for anything else, including an empty field.
 */
export function parseDecimal(text: string): number {
  const trimmed = text.trim()
  return DECIMAL.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN
}

/** A number as a field's text (see useDraftField). */
export const DECIMAL_TEXT: TextCodec<number, string> = {
  write: (value) => String(value),
  read: (text) => parseDecimal(text),
}
