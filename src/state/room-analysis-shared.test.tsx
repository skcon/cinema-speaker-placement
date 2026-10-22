import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  analyzeRoom,
  encodeConfig,
  withRoomObjectAdded,
  type RoomObjectAddition,
} from '@/domain'
import { createAppRouter } from '@/router'
import { createConfigStore } from '@/state/config-store'

// Count the analyses and encodings, still working them out for real.
vi.mock('@/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain')>()
  return {
    ...actual,
    analyzeRoom: vi.fn(actual.analyzeRoom),
    encodeConfig: vi.fn(actual.encodeConfig),
  }
})

/** The share link of the default room with four furniture boxes and three openings. */
function roomWithObjectsPath() {
  const store = createConfigStore()
  const addRoomObject = (addition: RoomObjectAddition) =>
    store
      .getState()
      .applyEdit((config) => withRoomObjectAdded(config, addition))
  addRoomObject({ kind: 'furniture', preset: 'cabinet' })
  addRoomObject({ kind: 'furniture', preset: 'table' })
  addRoomObject({ kind: 'furniture', preset: 'shelf' })
  addRoomObject({ kind: 'furniture', preset: 'cabinet' })
  addRoomObject({ kind: 'opening', preset: 'door' })
  addRoomObject({ kind: 'opening', preset: 'window' })
  addRoomObject({ kind: 'opening', preset: 'door' })
  const config = store.getState().config
  expect(config.roomObjects.furniture).toHaveLength(4)
  expect(config.roomObjects.openings).toHaveLength(3)
  return `/?${new URLSearchParams({ config: encodeConfig(config) })}`
}

/** The text box labelled with `unit` inside the sidebar field for `dimension`. */
async function findInput(dimension: string, unit: 'm' | 'ft' | 'in') {
  const field = await screen.findByRole('group', { name: dimension })
  return within(field).getByRole('textbox', { name: unit })
}

describe('the shared Room analysis', () => {
  it('analyzes the room and encodes the share link once per change, however many sections, boxes and openings read them', async () => {
    const path = roomWithObjectsPath()
    vi.mocked(analyzeRoom).mockClear()
    vi.mocked(encodeConfig).mockClear()
    const history = createMemoryHistory({ initialEntries: [path] })
    render(<RouterProvider router={createAppRouter({ history })} />)

    const width = await findInput('Width', 'm')
    // Each furniture box and opening has its own form, with a Remove button.
    expect(
      screen.getAllByRole('button', { name: /^Remove (?!.*recent rooms$)/ }),
    ).toHaveLength(7)
    expect(analyzeRoom).toHaveBeenCalledTimes(1)
    expect(encodeConfig).toHaveBeenCalledTimes(1)

    fireEvent.change(width, { target: { value: '5' } })

    expect(analyzeRoom).toHaveBeenCalledTimes(2)
    expect(encodeConfig).toHaveBeenCalledTimes(2)
  })
})
