/**
 * The Layout, written `X.Y.Z`: X listener-level channels, Y subwoofers and
 * Z overhead channels (GLOSSARY.md). Plain data, so it can go into a share
 * link as it is.
 */

/** How many subwoofers (the Y): 1 to 4 for every v1 layout (issue #2). */
export type SubwooferCount = 1 | 2 | 3 | 4

/**
 * X and Z of a v1 layout: 2.1, 3.1, 5.1 and 7.1, and 5.1 or 7.1 with 2 or 4
 * overhead speakers. Dolby uses the same listener-level angles whatever
 * the subwoofer count, since Dolby Atmos makes one LFE signal however many
 * subwoofer outputs there are (IG p.16).
 */
export type SpeakerFormat =
  | { readonly listenerLevel: 2 | 3; readonly overheads: 0 }
  | { readonly listenerLevel: 5 | 7; readonly overheads: 0 | 2 | 4 }

export type Layout = SpeakerFormat & { readonly subwoofers: SubwooferCount }

/** First-visit layout from the v1 spec (issue #2, user story 6). */
export const DEFAULT_LAYOUT: Layout = {
  listenerLevel: 5,
  subwoofers: 1,
  overheads: 2,
}

/** The layout in `X.Y.Z` notation, leaving out `.Z` without overheads: "5.1.2", "7.2", "2.1". */
export function formatLayout({
  listenerLevel,
  subwoofers,
  overheads,
}: Layout): string {
  const xy = `${listenerLevel}.${subwoofers}`
  return overheads === 0 ? xy : `${xy}.${overheads}`
}
