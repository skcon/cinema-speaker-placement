import { useState } from 'react'

/**
 * How a stored value is written as a field's text, and read back. A codec
 * is a module constant (one per unit system for lengths): a field whose
 * codec changes, as on a unit switch, starts over from the stored value.
 */
export type TextCodec<V, T> = {
  /** The text a field shows for a stored value. */
  readonly write: (value: V) => T
  /** The value typed text describes (NaN where it is not a number), given the stored one. */
  readonly read: (text: T, stored: V) => V
  /**
   * The text to keep after the stored value changed elsewhere, from
   * `previous` to `stored`. Without it the text is kept only while it
   * still reads as the stored value (so "7.250" stays after its own edit
   * stored 7.25), and otherwise starts over.
   */
  readonly reseed?: (text: T, previous: V, stored: V) => T
}

/** What a field shows and does, from useDraftField. */
export type DraftField<T, P> = {
  /** The text to show: what the user typed, or the stored value written out. */
  readonly text: T
  /** Why the typed value is rejected, or null when check accepts it. */
  readonly problem: P | null
  /** The user changed the text. */
  readonly edit: (text: T) => void
  /** The user left the field (blur, Enter). */
  readonly leave: () => void
}

/**
 * One field's text against its stored value: what every sidebar field
 * shares. The user's text stays as typed, with check's problem for it,
 * while the store keeps the last value it accepted. Accepted values go to
 * `onCommit` as they are typed (`commitOn: 'edit'`, the default), or when
 * the field is left (`'leave'`: one edit is one undo step, and the value
 * isn't moved while it is typed); text left with a rejected value stays,
 * with its problem, as it does while typed. When the stored value changes elsewhere
 * (undo, a drag, a share link) or the codec does (a unit switch) the text
 * starts over from the stored value, as TextCodec says.
 *
 * `accept` overrides what is stored from a typed value (null stores
 * nothing); by default it is the typed value when check accepts it.
 */
export function useDraftField<V, T, P>({
  value,
  codec,
  check,
  onCommit,
  commitOn = 'edit',
  accept = (typed) => (check(typed) === null ? typed : null),
}: {
  /** The stored value. */
  value: V
  codec: TextCodec<V, T>
  /** Why a typed value can't be stored, or null when it can. */
  check: (typed: V) => P | null
  onCommit: (value: V) => void
  commitOn?: 'edit' | 'leave'
  accept?: (typed: V, stored: V) => V | null
}): DraftField<T, P> {
  // The typed text, or null while the field shows the stored value.
  const [typed, setTyped] = useState<T | null>(null)
  const [seen, setSeen] = useState({ value, codec })

  // Adjust state while rendering (react.dev "You Might Not Need an Effect").
  if (seen.value !== value || seen.codec !== codec) {
    setSeen({ value, codec })
    if (typed !== null) {
      setTyped(
        seen.codec !== codec ? null : reseed(codec, typed, seen.value, value),
      )
    }
  }

  const text = typed ?? codec.write(value)

  function commit(next: T) {
    const accepted = accept(codec.read(next, value), value)
    if (accepted !== null) onCommit(accepted)
  }

  return {
    text,
    problem: check(codec.read(text, value)),
    edit(next) {
      setTyped(next)
      if (commitOn === 'edit') commit(next)
    },
    leave() {
      if (commitOn !== 'leave' || typed === null) return
      const accepted = accept(codec.read(typed, value), value)
      // A rejected value stays, so its problem still shows.
      if (accepted === null) return
      onCommit(accepted)
      setTyped(null)
    },
  }
}

/** The typed text after the stored value changed, or null to start over. */
function reseed<V, T>(
  codec: TextCodec<V, T>,
  text: T,
  previous: V,
  stored: V,
): T | null {
  if (codec.reseed) return codec.reseed(text, previous, stored)
  return Object.is(codec.read(text, stored), stored) ? text : null
}
