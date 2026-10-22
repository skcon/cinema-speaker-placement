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
import { RecentRooms } from '@/ui/RecentRooms'
import { Seating } from '@/ui/Seating'
import { SelectedItemPanel } from '@/ui/SelectedItemPanel'
import { RoomForm } from '@/ui/RoomForm'
import { RoomObjectsForm } from '@/ui/RoomObjectsForm'
import { SidebarSection, SidebarSubsection } from '@/ui/SidebarSection'
import { SpeakerList } from '@/ui/SpeakerList'
import { SpeakerSpecsForm } from '@/ui/SpeakerSpecsForm'

/**
 * Page layout: a sidebar (about 1/5 width) for the room and layout config on
 * the left, the room view top-right and the response chart below it. On narrow
 * screens the areas stack vertically, with the room view and the chart right
 * under the page header and the config forms after them, so a phone shows the
 * room without scrolling past every form (#125). Only the visual order
 * changes there: the sidebar's box steps aside (`display: contents`) so its
 * header and its forms can sit either side of the main area.
 */
export function AppShell({
  shareLinkFor,
}: {
  /** The full URL that opens a config, for the Copy link button. */
  shareLinkFor: (config: Config) => string
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground lg:h-svh lg:flex-row">
      <div className="text-sidebar-foreground max-lg:contents lg:relative lg:flex lg:w-1/5 lg:min-w-64 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:border-r lg:bg-sidebar lg:p-4">
        <div className="flex flex-col gap-6 max-lg:border-b max-lg:bg-sidebar max-lg:p-4">
          <header className="flex flex-col gap-3">
            <div>
              <h1 className="text-lg font-semibold">
                Cinema Speaker Placement
              </h1>
              <p className="text-sm text-muted-foreground">
                Plan your home theater for sound, not looks.
              </p>
            </div>
            <HistoryButtons />
            <CopyLinkButton shareLinkFor={shareLinkFor} />
          </header>
          <LinkProblemMessage />
        </div>
        <aside
          aria-label="Room plan"
          className="flex flex-col gap-4 max-lg:relative max-lg:order-last max-lg:border-t max-lg:bg-sidebar max-lg:p-4"
        >
          {/* First, so it stays in view above the collapsible sections. */}
          <SelectedItemPanel />
          <RoomForm />
          <LayoutForm />
          <SidebarSection
            id="speakers"
            title="Speakers"
            description="Where each speaker goes, its angle from the MLP (main listening position: the seat the layout is aimed at), and its specs."
          >
            <SpeakerList />
            <PositionsForm />
            <SidebarSubsection title="Speaker specs">
              <SpeakerSpecsForm />
              <CrossoverField />
            </SidebarSubsection>
          </SidebarSection>
          <Seating />
          <RoomObjectsForm />
          <SidebarSection
            id="results"
            title="Results"
            description="How loud your speakers can play at the MLP, and the rooms you opened recently."
          >
            <SidebarSubsection title="Headroom at the MLP">
              <HeadroomIndicator />
            </SidebarSubsection>
            <SidebarSubsection title="Recent rooms">
              <RecentRooms />
            </SidebarSubsection>
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
