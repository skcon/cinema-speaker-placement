const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const DATE_FORMAT = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

/**
 * When a recent room was saved, as text relative to `now` (both in
 * milliseconds since the epoch): "just now", "5 min ago", "3 h ago",
 * "yesterday", "4 days ago", then the date, such as "Sep 1, 2026".
 */
export function formatSavedAt(savedAt: number, now: number): string {
  const ago = now - savedAt
  if (ago < MINUTE) return 'just now'
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)} min ago`
  if (ago < DAY) return `${Math.floor(ago / HOUR)} h ago`
  if (ago < 2 * DAY) return 'yesterday'
  if (ago < 7 * DAY) return `${Math.floor(ago / DAY)} days ago`
  return DATE_FORMAT.format(savedAt)
}
