import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { HistoryButtons } from '@/ui/HistoryButtons'
import { LayoutForm } from '@/ui/LayoutForm'
import { RoomForm } from '@/ui/RoomForm'

function renderWithLayoutForm() {
  render(
    <ConfigStoreProvider>
      <HistoryButtons />
      <LayoutForm />
      <RoomForm />
    </ConfigStoreProvider>,
  )
}

function chosenLayout() {
  return screen.getByRole('radio', { checked: true, name: /^\d\.1/ })
}

describe('undo and redo buttons', () => {
  it('are off until there is something to undo or redo', () => {
    renderWithLayoutForm()

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('take an edit back and make it again', () => {
    renderWithLayoutForm()
    fireEvent.click(screen.getByRole('radio', { name: '7.1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(chosenLayout()).toHaveAccessibleName('5.1.2')

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(chosenLayout()).toHaveAccessibleName('7.1')
  })

  it('answer Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and Ctrl+Y', () => {
    renderWithLayoutForm()
    fireEvent.click(screen.getByRole('radio', { name: '7.1' }))

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    expect(chosenLayout()).toHaveAccessibleName('5.1.2')
    fireEvent.keyDown(document.body, {
      key: 'Z',
      metaKey: true,
      shiftKey: true,
    })
    expect(chosenLayout()).toHaveAccessibleName('7.1')
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true })
    expect(chosenLayout()).toHaveAccessibleName('7.1')
  })

  it('leave Ctrl/Cmd+Z to a text box while typing in it', () => {
    renderWithLayoutForm()
    fireEvent.click(screen.getByRole('radio', { name: '7.1' }))

    fireEvent.keyDown(screen.getAllByRole('textbox')[0]!, {
      key: 'z',
      ctrlKey: true,
    })

    expect(chosenLayout()).toHaveAccessibleName('7.1')
  })
})
