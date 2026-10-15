import { useId } from 'react'
import { formatLength } from '@/domain'
import { useConfig } from '@/state/config-context'
import { useSelectedItem, useSelection } from '@/state/selection-context'
import { dimensionTargetName } from '@/scene/dimensions'
import { Button } from '@/ui/components/button'

/**
 * The Selected item's details in the sidebar: its name, where it is (from
 * its two nearest walls), its height, its distance to the MLP and whether
 * it is auto or manual, with a button to clear the selection. Without a
 * selection it says how to make one. Shown from the desktop layout up;
 * on narrower screens the room view reads the selection out instead.
 */
export function SelectedItemPanel() {
  const headingId = useId()
  const item = useSelectedItem()
  const { clear } = useSelection()
  const units = useConfig((state) => state.config.units)

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-lg border bg-background/50 p-3 text-sm max-lg:hidden"
    >
      <h2 id={headingId} className="font-semibold">
        Selected item
      </h2>
      {/* Announces the newly selected item's name, or that none is. */}
      <div aria-live="polite">
        {item ? (
          <h3 className="font-medium">{item.name}</h3>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nothing selected. Click a speaker, a subwoofer or the listening
            position in the room view, or open its row under Positions, to see
            how far it is from the walls and the main listening position. Escape
            clears it.
          </p>
        )}
      </div>
      {item && (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Position</dt>
            <dd>
              {item.distances.walls
                .map(
                  ({ wall, meters }) =>
                    `${formatLength(meters, units)} from ${dimensionTargetName(wall)}`,
                )
                .join(', ')}
            </dd>
            <dt className="text-muted-foreground">Height</dt>
            <dd className="tabular-nums">
              {formatLength(item.position.z, units)}
            </dd>
            {item.distances.mlp && (
              <>
                <dt className="text-muted-foreground">To the MLP</dt>
                <dd className="tabular-nums">
                  {formatLength(item.distances.mlp.meters, units)}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Placement</dt>
            <dd>{item.placement}</dd>
          </dl>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={clear}
          >
            Clear selection
          </Button>
        </>
      )}
    </section>
  )
}
