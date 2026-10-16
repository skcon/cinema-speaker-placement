import type { PlacementWarning } from '@/domain'
import { formatWarning } from '@/ui/lib/placement-warning-text'

/**
 * Placement warnings as a list: each one's message, where its rule comes
 * from (standard, manufacturer, community practice or ours) with linked
 * sources, and what is ours. Hints, never blocks (ADR 0006).
 */
export function PlacementWarningList({
  warnings,
  label = 'Placement warnings',
}: {
  warnings: readonly PlacementWarning[]
  label?: string
}) {
  if (warnings.length === 0) return null
  return (
    <ul aria-label={label} className="flex flex-col gap-1.5 text-xs">
      {warnings.map((warning, index) => (
        <WarningItem key={index} warning={warning} />
      ))}
    </ul>
  )
}

function WarningItem({ warning }: { warning: PlacementWarning }) {
  const { id, message, sourceClass, note, sources } = formatWarning(warning)
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-amber-300 bg-amber-50 p-1.5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <p>
        <span className="font-medium">Placement warning: </span>
        {message}
      </p>
      <p className="opacity-80">
        {id}, {sourceClass}
        {/* A rule that is our own assumption may cite no source. */}
        {sources.length > 0 && ': '}
        {sources.map(({ title, url, detail }, at) => (
          <span key={at}>
            {at > 0 && '; '}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {title}
              </a>
            ) : (
              title
            )}
            {detail && ` (${detail})`}
          </span>
        ))}
        . {note}
      </p>
    </li>
  )
}

/**
 * A placement warning in a speaker list row: its message only, the
 * details being in the Selected item and Room objects panels.
 */
export function WarningLines({
  warnings,
}: {
  warnings: readonly PlacementWarning[]
}) {
  return warnings.map(({ message }, index) => (
    <p key={index} className="text-xs text-amber-800 dark:text-amber-300">
      <span className="font-medium">Placement warning: </span>
      {message}
    </p>
  ))
}
