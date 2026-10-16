import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '@/state/recent-rooms-storage'
import {
  COLLAPSED_SECTIONS_STORAGE_KEY,
  collapsedSectionsStorage,
} from '@/state/collapsed-sections-storage'

/** A storage like localStorage, holding `stored` under the collapsed-sections key. */
function memoryStorage(stored?: string) {
  const items = new Map<string, string>()
  if (stored !== undefined) items.set(COLLAPSED_SECTIONS_STORAGE_KEY, stored)
  const storage: KeyValueStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
  return { storage, stored: () => items.get(COLLAPSED_SECTIONS_STORAGE_KEY) }
}

describe('collapsed sidebar sections storage', () => {
  it('has every section open when nothing is stored', () => {
    const { storage } = memoryStorage()
    const sections = collapsedSectionsStorage(() => storage)

    expect(sections.isCollapsed('room')).toBe(false)
  })

  it('keeps a collapsed section collapsed in a later visit, and only that one', () => {
    const { storage } = memoryStorage()
    collapsedSectionsStorage(() => storage).setCollapsed('speakers', true)

    const later = collapsedSectionsStorage(() => storage)

    expect(later.isCollapsed('speakers')).toBe(true)
    expect(later.isCollapsed('room')).toBe(false)
  })

  it('opens a section again for later visits once it is expanded', () => {
    const { storage } = memoryStorage()
    const sections = collapsedSectionsStorage(() => storage)
    sections.setCollapsed('speakers', true)
    sections.setCollapsed('results', true)

    sections.setCollapsed('speakers', false)

    const later = collapsedSectionsStorage(() => storage)
    expect(later.isCollapsed('speakers')).toBe(false)
    expect(later.isCollapsed('results')).toBe(true)
  })

  it.each([['not json'], ['{"room":true}'], ['[1, null]']])(
    'has every section open when the stored text is unreadable (%s), and can still collapse one',
    (text) => {
      const { storage } = memoryStorage(text)
      const sections = collapsedSectionsStorage(() => storage)

      expect(sections.isCollapsed('room')).toBe(false)
      sections.setCollapsed('room', true)
      expect(sections.isCollapsed('room')).toBe(true)
    },
  )

  it('works for the rest of the visit when storage throws', () => {
    const sections = collapsedSectionsStorage(() => throwingStorage)

    expect(sections.isCollapsed('room')).toBe(false)
    sections.setCollapsed('room', true)
    expect(sections.isCollapsed('room')).toBe(true)
    sections.setCollapsed('room', false)
    expect(sections.isCollapsed('room')).toBe(false)
  })

  it('works when even reaching storage throws, as with blocked site data', () => {
    const sections = collapsedSectionsStorage(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })

    sections.setCollapsed('seating', true)

    expect(sections.isCollapsed('seating')).toBe(true)
  })
})

/** A storage that throws on every call, as a blocked or full one does. */
const throwingStorage: KeyValueStorage = {
  getItem: () => {
    throw new DOMException('Blocked', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('Full', 'QuotaExceededError')
  },
  removeItem: () => {
    throw new DOMException('Blocked', 'SecurityError')
  },
}
