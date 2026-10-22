import { act, renderHook } from '@testing-library/react'
import { useContext, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { encodeConfig, withLayout } from '@/domain'
import { ConfigStoreContext } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { useSelectedItem, useSelection } from '@/state/selection-context'

function wrapper({ children }: { children: ReactNode }) {
  return <ConfigStoreProvider>{children}</ConfigStoreProvider>
}

/** The selection, the selected item and the config store, in one render. */
function renderSelection() {
  return renderHook(
    () => ({
      selection: useSelection(),
      item: useSelectedItem(),
      store: useContext(ConfigStoreContext)!,
    }),
    { wrapper },
  )
}

describe('the selected item', () => {
  it('is nothing at first', () => {
    const { result } = renderSelection()

    expect(result.current.selection.selected).toBeNull()
    expect(result.current.item).toBeNull()
  })

  it('is the item selected, with its name, placement and distances to the walls and the MLP', () => {
    const { result } = renderSelection()

    act(() => result.current.selection.select('L'))

    const item = result.current.item
    expect(item?.id).toBe('L')
    expect(item?.name).toBe('Left')
    expect(item?.placement).toBe('auto')
    // Hand-computed in src/domain/item-distances.test.ts.
    expect(item?.distances.walls.map(({ wall }) => wall)).toEqual([
      'front',
      'left',
    ])
    expect(item?.distances.mlp?.meters).toBeCloseTo(2.03517, 4)
  })

  it('can be the MLP, which has no distance to itself', () => {
    const { result } = renderSelection()

    act(() => result.current.selection.select('MLP'))

    expect(result.current.item?.name).toBe('MLP')
    expect(result.current.item?.distances.mlp).toBeNull()
  })

  it('is cleared back to nothing', () => {
    const { result } = renderSelection()

    act(() => result.current.selection.select('Sub1'))
    act(() => result.current.selection.clear())

    expect(result.current.selection.selected).toBeNull()
    expect(result.current.item).toBeNull()
  })

  it('is nothing once its item leaves the layout', () => {
    const { result } = renderSelection()

    act(() => result.current.selection.select('Ltm'))
    expect(result.current.item?.name).toBe('Left Top Middle')
    act(() =>
      result.current.store
        .getState()
        .applyEdit((config) =>
          withLayout(config, { ...config.layout, dolbyLayout: '5.1' }),
        ),
    )

    expect(result.current.item).toBeNull()
  })

  it('never changes the config, the share link or the undo history', () => {
    const { result } = renderSelection()
    const before = result.current.store.getState().config

    act(() => result.current.selection.select('L'))
    act(() => result.current.selection.select('MLP'))
    act(() => result.current.selection.clear())

    const after = result.current.store.getState()
    expect(after.config).toBe(before)
    expect(encodeConfig(after.config)).toBe(encodeConfig(before))
    expect(after.history).toEqual({ canUndo: false, canRedo: false })
  })
})
