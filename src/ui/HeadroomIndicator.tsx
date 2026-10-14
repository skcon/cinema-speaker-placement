import { useId } from 'react'
import type { HeadroomStatus } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import {
  groupSentence,
  HEADROOM_STATUS_STYLES,
  referenceSentence,
  subwooferSentence,
} from '@/ui/lib/headroom-text'

/**
 * Whether the Speakers and Subwoofers can reach reference level at the MLP
 * (user story 47): a status per speaker group of the layout and for the
 * Subwoofers, each in plain language, and clearly an estimate.
 */
export function HeadroomIndicator() {
  const listId = useId()
  const { headroom } = useRoomAnalysis()
  const units = useConfig((state) => state.config.units)
  const { groups, subwoofers, amplifierWatts, overheadsNotPlaced } = headroom

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {referenceSentence(headroom)} A rough estimate, not a measurement: free
        field at the MLP, from sensitivity, power and distance, without room
        gain.
      </p>
      <span id={listId} className="sr-only">
        Headroom
      </span>
      <ul aria-labelledby={listId} className="flex flex-col gap-2 text-sm">
        {groups.map((group) => (
          <HeadroomItem
            key={group.group}
            name={group.name}
            status={group.status}
            text={groupSentence(group, amplifierWatts, units)}
          />
        ))}
        {overheadsNotPlaced && (
          <HeadroomItem
            name="Overheads"
            status={null}
            text="Not placed yet, so not checked."
          />
        )}
        <HeadroomItem
          name="Subwoofers"
          status={subwoofers.status}
          text={subwooferSentence(subwoofers)}
        />
      </ul>
    </div>
  )
}

function HeadroomItem({
  name,
  status,
  text,
}: {
  name: string
  status: HeadroomStatus | null
  text: string
}) {
  const style = status && HEADROOM_STATUS_STYLES[status]
  return (
    <li className="flex flex-col gap-0.5 border-t pt-2">
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{name}</span>
        {style ? (
          <span className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-xs"
              style={{ backgroundColor: style.color }}
            />
            {style.label}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not checked</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </li>
  )
}
