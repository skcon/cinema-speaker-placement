/**
 * Which sidebar sections this browser has collapsed: a per-browser
 * convenience (issue #52), kept in browser storage when it can be and in
 * memory for the visit when it can't, never throwing.
 */
import type { KeyValueStorage } from './recent-rooms-storage'

/** Where the collapsed sidebar sections are kept in browser storage. */
export const COLLAPSED_SECTIONS_STORAGE_KEY =
  'cinema-speaker-placement:collapsed-sidebar-sections'

/** Reads and remembers whether a sidebar section, by its id, is collapsed. */
export type CollapsedSections = {
  isCollapsed: (id: string) => boolean
  setCollapsed: (id: string, collapsed: boolean) => void
}

/**
 * The collapsed sections in `storage`, which is called on every access,
 * since even reaching localStorage can throw (blocked site data). Once
 * reading or writing fails, the sections live in memory for the rest of
 * this visit instead.
 */
export function collapsedSectionsStorage(
  storage: () => KeyValueStorage,
): CollapsedSections {
  let fallback: string[] | null = null

  function read(): string[] {
    if (fallback) return fallback
    try {
      return parseIds(storage().getItem(COLLAPSED_SECTIONS_STORAGE_KEY))
    } catch {
      fallback = []
      return fallback
    }
  }

  function write(ids: string[]) {
    if (!fallback) {
      try {
        storage().setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify(ids))
        return
      } catch {
        // Blocked or full: remember the sections in memory instead.
      }
    }
    fallback = ids
  }

  return {
    isCollapsed: (id) => read().includes(id),
    setCollapsed: (id, collapsed) => {
      const ids = read().filter((other) => other !== id)
      write(collapsed ? [...ids, id] : ids)
    },
  }
}

/** The stored section ids; none when nothing or something unreadable is stored. */
function parseIds(text: string | null): string[] {
  if (text === null) return []
  try {
    const value: unknown = JSON.parse(text)
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}
