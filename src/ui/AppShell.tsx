import { cn } from 'cn'
import { useId, type ReactNode } from 'react'
import type { Config } from '@/domain'
import { RoomView } from '@/scene/RoomView'
import { CopyLinkButton } from '@/ui/CopyLinkButton'
import { LinkProblemMessage } from '@/ui/LinkProblemMessage'
import { LayoutForm } from '@/ui/LayoutForm'
import { RoomForm } from '@/ui/RoomForm'
import { SpeakerList } from '@/ui/SpeakerList'

/**
 * Page layout: a sidebar (about 1/5 width) for the room and layout config on
 * the left, the room view top-right and the response chart below it. On narrow
 * screens the three areas stack vertically.
 */
export function AppShell({
  shareLinkFor,
}: {
  /** The full URL that opens a config, for the Copy link button. */
  shareLinkFor: (config: Config) => string
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground lg:h-svh lg:flex-row">
      <div className="flex flex-col gap-6 border-b bg-sidebar p-4 text-sidebar-foreground lg:w-1/5 lg:min-w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <header className="flex flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold">Cinema Speaker Placement</h1>
            <p className="text-sm text-muted-foreground">
              Plan your home theater for sound, not looks.
            </p>
          </div>
          <CopyLinkButton shareLinkFor={shareLinkFor} />
        </header>
        <LinkProblemMessage />
        <aside
          aria-labelledby="sidebar-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="sidebar-heading" className="font-medium">
            Room and layout
          </h2>
          <RoomForm />
          <LayoutForm />
          <SpeakerList />
        </aside>
      </div>
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <Panel title="Room view" className="min-h-128 lg:min-h-0 lg:flex-3">
          <RoomView />
        </Panel>
        <Panel
          title="Estimated response"
          note="An estimate from a simplified model, never a measurement."
          className="min-h-64 lg:min-h-0 lg:flex-2"
        >
          <Placeholder>
            The estimated response at the MLP, compared with the target curve,
            will be charted here.
          </Placeholder>
        </Panel>
      </main>
    </div>
  )
}

function Panel({
  title,
  note,
  className,
  children,
}: {
  title: string
  note?: string
  className?: string
  children: ReactNode
}) {
  const headingId = useId()
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
      {children}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </section>
  )
}

/** Stands in for a panel's content until its ticket lands. */
function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      <p>{children}</p>
    </div>
  )
}
