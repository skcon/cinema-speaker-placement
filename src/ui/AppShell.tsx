import { cn } from 'cn'
import { useId, type ReactNode } from 'react'
import { ResponsePanel } from '@/charts/ResponsePanel'
import type { Config } from '@/domain'
import { RoomView } from '@/scene/RoomView'
import { CopyLinkButton } from '@/ui/CopyLinkButton'
import { CrossoverField } from '@/ui/CrossoverField'
import { HeadroomIndicator } from '@/ui/HeadroomIndicator'
import { HistoryButtons } from '@/ui/HistoryButtons'
import { LinkProblemMessage } from '@/ui/LinkProblemMessage'
import { LayoutForm } from '@/ui/LayoutForm'
import { PositionsForm } from '@/ui/PositionsForm'
import { RecommendedSeat } from '@/ui/RecommendedSeat'
import { RoomForm } from '@/ui/RoomForm'
import { SidebarSection } from '@/ui/SidebarSection'
import { SpeakerList } from '@/ui/SpeakerList'
import { SpeakerSpecsForm } from '@/ui/SpeakerSpecsForm'

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
      <div className="relative flex flex-col gap-6 border-b bg-sidebar p-4 text-sidebar-foreground lg:w-1/5 lg:min-w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <header className="flex flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold">Cinema Speaker Placement</h1>
            <p className="text-sm text-muted-foreground">
              Plan your home theater for sound, not looks.
            </p>
          </div>
          <HistoryButtons />
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
          <PositionsForm />
          <RecommendedSeat />
          <SidebarSection title="Speaker specs">
            <SpeakerSpecsForm />
            <CrossoverField />
          </SidebarSection>
          <SidebarSection title="Headroom at the MLP">
            <HeadroomIndicator />
          </SidebarSection>
        </aside>
      </div>
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <Panel title="Room view" className="min-h-128 lg:min-h-0 lg:flex-3">
          <RoomView />
        </Panel>
        <Panel
          title="Estimated response"
          note="An estimate from a simplified model, never a measurement."
          className="lg:min-h-0 lg:flex-2 lg:overflow-y-auto"
        >
          <ResponsePanel />
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
