import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Config } from '@/domain'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { LayoutForm } from '@/ui/LayoutForm'
import { SpeakerSpecsForm } from '@/ui/SpeakerSpecsForm'

/** Shows the stored speaker groups and amplifier power, as the share link carries them. */
function Stored() {
  const config = useConfig((state) => state.config)
  return (
    <output>
      {JSON.stringify({
        speakerGroups: config.speakerGroups,
        amplifierWatts: config.amplifierWatts,
      })}
    </output>
  )
}

function stored(): Pick<Config, 'speakerGroups' | 'amplifierWatts'> {
  return JSON.parse(screen.getByRole('status').textContent ?? '') as Pick<
    Config,
    'speakerGroups' | 'amplifierWatts'
  >
}

function renderForm() {
  render(
    <ConfigStoreProvider>
      <LayoutForm />
      <SpeakerSpecsForm />
      <Stored />
    </ConfigStoreProvider>,
  )
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

describe('speaker group specs', () => {
  it('shows a form for each speaker group the layout uses', () => {
    renderForm()

    for (const name of ['Front L/R', 'Center', 'Surrounds', 'Overheads']) {
      expect(screen.getByRole('group', { name })).toBeVisible()
    }
    expect(
      screen.queryByRole('group', { name: 'Rear surrounds' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '7.1.4' }))
    expect(screen.getByRole('group', { name: 'Rear surrounds' })).toBeVisible()

    fireEvent.click(screen.getByRole('radio', { name: '2.1' }))
    expect(
      screen.queryByRole('group', { name: 'Center' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Overheads' }),
    ).not.toBeInTheDocument()
  })

  it('stores bookshelf or tower and a valid sensitivity per group', () => {
    renderForm()
    const front = screen.getByRole('group', { name: 'Front L/R' })

    fireEvent.click(within(front).getByRole('radio', { name: 'Tower' }))
    type(
      within(front).getByRole('textbox', { name: 'Sensitivity (dB)' }),
      '90.5',
    )

    expect(stored().speakerGroups.front).toEqual({
      specs: { type: 'tower', sensitivity: 90.5 },
    })
    expect(stored().speakerGroups.center.specs.sensitivity).toBe(88)
  })

  it('has no bookshelf or tower choice for overheads', () => {
    renderForm()
    const overheads = screen.getByRole('group', { name: 'Overheads' })

    expect(
      within(overheads).queryByRole('radio', { name: 'Tower' }),
    ).not.toBeInTheDocument()
    expect(
      within(overheads).getByRole('textbox', { name: 'Sensitivity (dB)' }),
    ).toHaveValue('88')
  })

  it('flags a sensitivity out of range inline and keeps the last valid one', () => {
    renderForm()
    const field = within(
      screen.getByRole('group', { name: 'Center' }),
    ).getByRole('textbox', { name: 'Sensitivity (dB)' })

    type(field, '120')

    expect(field).toHaveAccessibleDescription(
      expect.stringContaining('Sensitivity must be between 70 dB and 110 dB.'),
    )
    expect(stored().speakerGroups.center.specs.sensitivity).toBe(88)
  })
})

describe('amplifier power', () => {
  it('stores a valid power per channel and flags one out of range', () => {
    renderForm()
    const field = screen.getByRole('textbox', {
      name: 'Amplifier power per channel (W)',
    })

    type(field, '150')
    expect(stored().amplifierWatts).toBe(150)

    type(field, '0')
    expect(field).toHaveAccessibleDescription(
      expect.stringContaining(
        'Amplifier power must be between 1 W and 5,000 W.',
      ),
    )
    expect(stored().amplifierWatts).toBe(150)
  })
})
