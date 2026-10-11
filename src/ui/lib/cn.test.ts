import { cn } from 'cn'
import { describe, expect, it } from 'vitest'

describe('cn', () => {
  it('lets a later Tailwind class win over a conflicting earlier one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('px-2 py-1', 'p-3')).toBe('p-3')
    expect(cn('text-muted-foreground', 'text-blue-600')).toBe('text-blue-600')
  })

  it('keeps classes that only look alike, such as a text size and a theme text color', () => {
    expect(cn('text-xs', 'text-muted-foreground')).toBe(
      'text-xs text-muted-foreground',
    )
  })

  it('joins conditional class names like clsx', () => {
    const classes = (hidden: boolean) =>
      cn('px-2', hidden && 'hidden', { 'text-white': true, 'bg-black': false })

    expect(classes(false)).toBe('px-2 text-white')
    expect(classes(true)).toBe('px-2 hidden text-white')
  })
})
