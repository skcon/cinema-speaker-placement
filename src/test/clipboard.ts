import { vi } from 'vitest'

/**
 * Replaces the browser clipboard (which jsdom lacks) with a mock whose
 * writeText resolves, or rejects with `error` as when permission is denied.
 */
export function mockClipboard({ error }: { error?: Error } = {}) {
  const writeText = vi.fn<(text: string) => Promise<void>>(() =>
    error ? Promise.reject(error) : Promise.resolve(),
  )
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}
