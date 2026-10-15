import { cn } from 'cn'
import { useId, useState, type ReactNode } from 'react'
import { useCollapsedSections } from '@/state/collapsed-sections-context'

/** The sidebar's top-level sections, by the id their collapsed state is kept under. */
export type SidebarSectionId =
  'room' | 'layout' | 'speakers' | 'seating' | 'results'

/**
 * One of the sidebar's top-level sections (Room, Layout, Speakers, Seating,
 * Results), with a heading and a one-line explanation of what it does.
 * The button in the heading collapses and expands it; this browser
 * remembers which sections are collapsed, when it can.
 */
export function SidebarSection({
  id,
  title,
  description,
  children,
}: {
  id: SidebarSectionId
  title: string
  /** One plain-language line on what the section does. */
  description: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  const descriptionId = useId()
  const contentId = useId()
  const collapsedSections = useCollapsedSections()
  const [open, setOpen] = useState(() => !collapsedSections?.isCollapsed(id))

  function toggle() {
    setOpen(!open)
    collapsedSections?.setCollapsed(id, open)
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className="flex flex-col border-t pt-3 first:border-t-0 first:pt-0"
    >
      <h2 id={headingId} className="font-semibold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-lg:min-h-11"
        >
          {title}
          <span
            aria-hidden
            className={cn(
              'text-xs text-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          >
            ▶
          </span>
        </button>
      </h2>
      <p id={descriptionId} className="text-xs text-muted-foreground">
        {description}
      </p>
      <div id={contentId} hidden={!open} className="mt-3 flex flex-col gap-4">
        {children}
      </div>
    </section>
  )
}

/** A headed part of a sidebar section, such as Positions under Speakers. */
export function SidebarSubsection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold">
        {title}
      </h3>
      {children}
    </section>
  )
}
