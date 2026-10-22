import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { LayoutForm } from '@/ui/LayoutForm'
import { SpeakerList } from '@/ui/SpeakerList'

function renderSpeakerList() {
  render(
    <ConfigStoreProvider>
      <LayoutForm />
      <SpeakerList />
    </ConfigStoreProvider>,
  )
}

/** Each body row of the speaker table as its cells' text. */
function speakerRows() {
  const table = screen.getByRole('table', { name: 'Speakers' })
  const [, ...rows] = within(table).getAllByRole('row')
  return rows.map((row) =>
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  )
}

describe('speaker list', () => {
  it('lists the default speakers by Dolby name, with the abbreviation the room view shows, the angle from the MLP and the grade', () => {
    renderSpeakerList()

    expect(speakerRows()).toEqual([
      ['LLeft', '29°', 'ideal'],
      ['CCenter', '0°', 'ideal'],
      ['RRight', '29°', 'ideal'],
      ['LsLeft Surround', '115°', 'ideal'],
      ['RsRight Surround', '115°', 'ideal'],
      ['LtmLeft Top Middle', 'elev. 83°', 'ideal'],
      ['RtmRight Top Middle', 'elev. 83°', 'ideal'],
      ['Sub1Subwoofer 1', '—none', 'ungraded'],
    ])
    expect(
      screen.getByRole('columnheader', { name: 'Angle from MLP' }),
    ).toBeInTheDocument()
  })

  it('follows the layout', () => {
    renderSpeakerList()

    fireEvent.click(screen.getByRole('radio', { name: '7.1' }))

    expect(speakerRows()).toContainEqual([
      'LrsLeft Rear Surround',
      '143°',
      'ideal',
    ])
  })

  it('lists the overheads with their angle from the MLP and their elevation, graded on both', () => {
    renderSpeakerList()

    fireEvent.click(screen.getByRole('radio', { name: '7.1.4' }))

    // Default room: 1.17 m out and 1.4 m ahead of the MLP, 1.4 m up.
    expect(speakerRows()).toEqual(
      expect.arrayContaining([
        ['LtfLeft Top Front', '40° · elev. 45°', 'ideal'],
        ['RtrRight Top Rear', '140° · elev. 135°', 'ideal'],
      ]),
    )
    expect(
      screen.getByText(/overhead speakers are also graded on their elevation/i),
    ).toBeInTheDocument()
  })

  it('lists every subwoofer, ungraded, as Dolby gives subwoofers no placement range', () => {
    renderSpeakerList()

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Subwoofers' })).getByRole(
        'radio',
        { name: '4' },
      ),
    )

    expect(speakerRows().slice(-4)).toEqual([
      ['Sub1Subwoofer 1', '—none', 'ungraded'],
      ['Sub2Subwoofer 2', '—none', 'ungraded'],
      ['Sub3Subwoofer 3', '—none', 'ungraded'],
      ['Sub4Subwoofer 4', '—none', 'ungraded'],
    ])
    expect(
      screen.getByText(/subwoofers have no dolby placement range/i),
    ).toBeInTheDocument()
  })
})
