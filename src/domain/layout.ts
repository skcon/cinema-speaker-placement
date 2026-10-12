/**
 * The Layout, written `X.Y.Z`: X listener-level channels, Y subwoofers and
 * Z overhead channels (GLOSSARY.md). Stored as its Dolby layout plus the
 * subwoofer count, so only v1 layouts can be represented, and as plain data
 * a share link can carry and validate.
 */
import { DOLBY_LAYOUTS, type DolbyLayout } from './dolby-layouts'

/** The subwoofer counts (the Y) every v1 layout can have (issue #2). */
export const SUBWOOFER_COUNTS = [1, 2, 3, 4] as const

/** How many subwoofers (the Y): 1 to 4 for every v1 layout. */
export type SubwooferCount = (typeof SUBWOOFER_COUNTS)[number]

export type Layout = {
  /**
   * X and Z, as Dolby's guide names the layout ("5.1.2"). Dolby uses the
   * same listener-level angles whatever the subwoofer count, since Dolby
   * Atmos makes one LFE signal however many subwoofer outputs there are
   * (IG p.16).
   */
  readonly dolbyLayout: DolbyLayout
  readonly subwoofers: SubwooferCount
}

/** A layout's channel counts and its name in `X.Y.Z` notation. */
export type LayoutSummary = {
  /** For example "5.1.2", "7.2.4" or "2.1" (no `.Z` without overheads). */
  readonly name: string
  readonly listenerLevel: number
  readonly subwoofers: SubwooferCount
  readonly overheads: number
}

/** First-visit layout from the v1 spec (issue #2, user story 6). */
export const DEFAULT_LAYOUT: Layout = { dolbyLayout: '5.1.2', subwoofers: 1 }

export function summarizeLayout({
  dolbyLayout,
  subwoofers,
}: Layout): LayoutSummary {
  const { listenerLevel, overheads } = DOLBY_LAYOUTS[dolbyLayout]
  const xy = `${listenerLevel}.${subwoofers}`
  return {
    name: overheads === 0 ? xy : `${xy}.${overheads}`,
    listenerLevel,
    subwoofers,
    overheads,
  }
}

/** The layout in `X.Y.Z` notation: "5.1.2", "7.2.4", "2.1". */
export function formatLayout(layout: Layout): string {
  return summarizeLayout(layout).name
}
