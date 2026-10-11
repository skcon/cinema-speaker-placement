import { lazy, Suspense, useState } from 'react'
import { formatLength, METERS_PER_FOOT, type UnitSystem } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { canUseWebGL } from '@/scene/webgl'

const RoomCanvas = lazy(() =>
  import('@/scene/RoomCanvas').then((module) => ({
    default: module.RoomCanvas,
  })),
)

/** Floor grid spacing per unit system: meters, or feet in imperial mode. */
const GRID = {
  metric: { spacing: 1, label: '1 m' },
  imperial: { spacing: METERS_PER_FOOT, label: '1 ft' },
} as const satisfies Record<UnitSystem, { spacing: number; label: string }>

/**
 * The room view panel's content: the top-down scene with a text description
 * for screen readers, or the description alone when WebGL is unavailable.
 */
export function RoomView() {
  const [webGL] = useState(canUseWebGL)
  const { room, units } = useConfig((state) => state.config)
  const { mlp } = useRoomAnalysis()
  const grid = GRID[units]

  const description =
    `Top-down view of the room, ${formatLength(room.length, units)} long ` +
    `and ${formatLength(room.width, units)} wide, with the front wall at ` +
    `the top and the MLP ${formatLength(mlp.y, units)} from the front wall.`

  if (!webGL) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>{description}</p>
        <p>This browser can&rsquo;t draw the room view (no WebGL 2).</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        role="img"
        aria-label={description}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
      >
        <Suspense
          fallback={
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading the room view&hellip;
            </p>
          }
        >
          <RoomCanvas room={room} mlp={mlp} gridSpacing={grid.spacing} />
        </Suspense>
      </div>
      <p className="text-xs text-muted-foreground">
        To scale, seen from above. Grid squares are {grid.label}.
      </p>
    </div>
  )
}
