import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { describeRecentRoom } from '@/domain'
import { withConfigParam } from '@/search'
import { useRecentRooms } from '@/state/recent-rooms-context'
import { Button } from '@/ui/components/button'
import { formatSavedAt } from '@/ui/lib/saved-at'

/** How often the "5 min ago" times are brought up to date. */
const CLOCK_TICK_MS = 60_000

/**
 * The rooms worked on in this browser, newest first. Each opens like a
 * share link (a new history entry, so Back returns to the room before) and
 * can be removed. Rooms whose encoded config no longer opens are left out.
 */
export function RecentRooms() {
  const rooms = useRecentRooms((state) => state.rooms)
  const remove = useRecentRooms((state) => state.remove)
  const clear = useRecentRooms((state) => state.clear)
  const now = useNow()
  const described = useMemo(
    () =>
      rooms.flatMap((room) => {
        const label = describeRecentRoom(room.encoded)
        return label ? [{ ...room, label }] : []
      }),
    [rooms],
  )

  if (described.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Rooms you work on in this browser show up here.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-1">
        {described.map(({ encoded, savedAt, label }) => (
          <li key={encoded} className="flex items-center gap-1">
            <Link
              to="."
              search={withConfigParam(encoded)}
              resetScroll={false}
              className="flex min-h-9 min-w-0 flex-1 flex-col justify-center rounded-md px-2 py-1 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none max-lg:min-h-11"
            >
              <span className="truncate text-sm">{label}</span>
              <span className="text-xs text-muted-foreground">
                Saved{' '}
                <time dateTime={new Date(savedAt).toISOString()}>
                  {formatSavedAt(savedAt, now)}
                </time>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${label} from recent rooms`}
              onClick={() => remove(encoded)}
              className="text-muted-foreground max-lg:size-11"
            >
              <span aria-hidden>×</span>
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        onClick={clear}
        className="self-start max-lg:h-11 max-lg:px-4"
      >
        Clear all
      </Button>
    </>
  )
}

/**
 * The time now, brought up to date every minute. A room saved since reads
 * "just now" (formatSavedAt treats a time ahead of `now` as just now).
 */
function useNow(): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}
