import { useId, type ReactNode } from 'react'

/**
 * A sidebar section the user can fold away, open at first: the sidebar is
 * long, especially on a phone where it sits above the room view.
 */
export function SidebarSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <details open className="group flex flex-col border-t pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm marker:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <h3 id={headingId} className="text-sm font-semibold">
          {title}
        </h3>
        <span
          aria-hidden
          className="text-xs text-muted-foreground transition-transform group-open:rotate-90"
        >
          ▶
        </span>
      </summary>
      <section aria-labelledby={headingId} className="mt-3 flex flex-col gap-4">
        {children}
      </section>
    </details>
  )
}
