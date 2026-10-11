import type { ReactNode } from 'react'
import { cn } from '@/ui/lib/utils'

/**
 * Page layout: a sidebar (about 1/5 width) for the room and layout config on
 * the left, the room view top-right and the response chart below it. On narrow
 * screens the three areas stack vertically.
 */
export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground lg:h-svh lg:flex-row">
      <div className="flex flex-col gap-6 border-b bg-sidebar p-4 text-sidebar-foreground lg:w-1/5 lg:min-w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <header>
          <h1 className="text-lg font-semibold">Cinema Speaker Placement</h1>
          <p className="text-sm text-muted-foreground">
            Plan your home theater for sound, not looks.
          </p>
        </header>
        <aside
          aria-labelledby="sidebar-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="sidebar-heading" className="font-medium">
            Room and layout
          </h2>
          <p className="text-sm text-muted-foreground">
            Room size, layout and speaker group specs will be set here.
          </p>
        </aside>
      </div>
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <Panel id="room-view" title="Room view" className="min-h-80 lg:flex-3">
          A top-down view of the room with every speaker and the MLP will be
          shown here.
        </Panel>
        <Panel
          id="estimated-response"
          title="Estimated response"
          note="An estimate from a simplified model, never a measurement."
          className="min-h-64 lg:flex-2"
        >
          The estimated response at the MLP, compared with the target curve,
          will be charted here.
        </Panel>
      </main>
    </div>
  )
}

function Panel({
  id,
  title,
  note,
  className,
  children,
}: {
  id: string
  title: string
  note?: string
  className?: string
  children: ReactNode
}) {
  const headingId = `${id}-heading`
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground',
        className,
      )}
    >
      <h2 id={headingId} className="font-medium">
        {title}
      </h2>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>{children}</p>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </section>
  )
}
