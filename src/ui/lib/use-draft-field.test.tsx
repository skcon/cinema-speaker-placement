import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DECIMAL_TEXT } from '@/ui/lib/decimal'
import { LENGTH_TEXT } from '@/ui/lib/length-input'
import {
  useDraftField,
  type DraftField,
  type TextCodec,
} from '@/ui/lib/use-draft-field'

/** Accepts 1 to 10. */
function oneToTen(value: number): 'out-of-range' | null {
  return value >= 1 && value <= 10 ? null : 'out-of-range'
}

type Props<T> = {
  value: number
  codec: TextCodec<number, T>
  onCommit: (value: number) => void
}

function renderDraft<T>(initial: Props<T>, commitOn?: 'edit' | 'leave') {
  return renderHook(
    ({ value, codec, onCommit }: Props<T>): DraftField<T, 'out-of-range'> =>
      useDraftField({ value, codec, check: oneToTen, onCommit, commitOn }),
    { initialProps: initial },
  )
}

describe('a draft field committed as typed', () => {
  it('starts from the stored value', () => {
    const { result } = renderDraft({
      value: 5,
      codec: DECIMAL_TEXT,
      onCommit: vi.fn(),
    })

    expect(result.current.text).toBe('5')
    expect(result.current.problem).toBeNull()
  })

  it('commits a value the check accepts, keeping the text as typed', () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderDraft({
      value: 5,
      codec: DECIMAL_TEXT,
      onCommit,
    })

    act(() => result.current.edit('7.50'))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(7.5)

    // The store now holds what was typed: the text stays as typed.
    rerender({ value: 7.5, codec: DECIMAL_TEXT, onCommit })
    expect(result.current.text).toBe('7.50')
  })

  it('keeps a rejected value in the field with its problem, committing nothing', () => {
    const onCommit = vi.fn()
    const { result } = renderDraft({
      value: 5,
      codec: DECIMAL_TEXT,
      onCommit,
    })

    act(() => result.current.edit('12'))

    expect(result.current.text).toBe('12')
    expect(result.current.problem).toBe('out-of-range')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('starts over from the stored value when it changes elsewhere (undo, a drag)', () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderDraft({
      value: 5,
      codec: DECIMAL_TEXT,
      onCommit,
    })
    act(() => result.current.edit('12'))

    rerender({ value: 3, codec: DECIMAL_TEXT, onCommit })

    expect(result.current.text).toBe('3')
    expect(result.current.problem).toBeNull()
  })

  it('starts over when the units change, even if the stored value did not', () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderDraft({
      value: 3,
      codec: LENGTH_TEXT.metric,
      onCommit,
    })
    act(() => result.current.edit(['3.000']))

    rerender({ value: 3, codec: LENGTH_TEXT.imperial, onCommit })

    expect(result.current.text).toEqual(['9', '10.1'])
  })

  it('lets a codec decide which parts of the text to keep', () => {
    // Two numbers as one value: a part is kept unless its own number moved.
    type Pair = readonly [number, number]
    const pair: TextCodec<Pair, readonly [string, string]> = {
      write: ([a, b]) => [String(a), String(b)],
      read: ([a, b]) => [Number(a), Number(b)],
      reseed: (text, previous, stored) => [
        previous[0] === stored[0] ? text[0] : String(stored[0]),
        previous[1] === stored[1] ? text[1] : String(stored[1]),
      ],
    }
    const { result, rerender } = renderHook(
      ({ value }: { value: Pair }) =>
        useDraftField({ value, codec: pair, check: () => null, onCommit() {} }),
      { initialProps: { value: [1, 2] as Pair } },
    )
    act(() => result.current.edit(['1.0', 'x']))

    rerender({ value: [4, 2] })

    expect(result.current.text).toEqual(['4', 'x'])
  })

  it('stores what accept gives, and nothing when it gives null', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() =>
      useDraftField({
        value: 5,
        codec: DECIMAL_TEXT,
        check: oneToTen,
        accept: (typed) => (typed > 8 ? 8 : null),
        onCommit,
      }),
    )

    act(() => result.current.edit('6'))
    act(() => result.current.edit('9'))

    expect(onCommit).toHaveBeenCalledExactlyOnceWith(8)
  })
})

describe('a draft field committed when it is left', () => {
  it('commits only when left, then shows the stored value', () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderDraft(
      { value: 5, codec: DECIMAL_TEXT, onCommit },
      'leave',
    )

    act(() => result.current.edit('7.50'))
    expect(onCommit).not.toHaveBeenCalled()

    act(() => result.current.leave())
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(7.5)

    rerender({ value: 7.5, codec: DECIMAL_TEXT, onCommit })
    expect(result.current.text).toBe('7.5')
  })

  it('commits nothing when left untouched', () => {
    const onCommit = vi.fn()
    const { result } = renderDraft(
      { value: 5, codec: DECIMAL_TEXT, onCommit },
      'leave',
    )

    act(() => result.current.leave())

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('drops a rejected value when left', () => {
    const onCommit = vi.fn()
    const { result } = renderDraft(
      { value: 5, codec: DECIMAL_TEXT, onCommit },
      'leave',
    )

    act(() => result.current.edit('abc'))
    act(() => result.current.leave())

    expect(onCommit).not.toHaveBeenCalled()
    expect(result.current.text).toBe('5')
  })

  it('follows the stored value while untouched (undo, a drag, the units)', () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderDraft(
      { value: 3, codec: LENGTH_TEXT.metric, onCommit },
      'leave',
    )

    rerender({ value: 4, codec: LENGTH_TEXT.metric, onCommit })
    expect(result.current.text).toEqual(['4'])

    rerender({ value: 4, codec: LENGTH_TEXT.imperial, onCommit })
    expect(result.current.text).toEqual(['13', '1.5'])
  })
})
