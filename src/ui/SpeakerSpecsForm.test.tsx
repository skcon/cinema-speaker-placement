import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Config } from '@/domain'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { LayoutForm } from '@/ui/LayoutForm'
import { RoomForm } from '@/ui/RoomForm'
import { SpeakerSpecsForm } from '@/ui/SpeakerSpecsForm'

/** Shows the stored subwoofer group, as the share link will carry it. */
function StoredSubwooferGroup() {
  const group = useConfig((state) => state.config.speakerGroups.subwoofers)
  return <output>{JSON.stringify(group)}</output>
}

/**
 * Stands in for another part of the app that changes the specs through the
 * store, as opening a share link or undo will.
 */
function SetRmsElsewhere() {
  const setSubwooferSpecs = useConfig((state) => state.setSubwooferSpecs)
  return (
    <button onClick={() => setSubwooferSpecs('group', { rmsWatts: 450 })}>
      Set 450 W elsewhere
    </button>
  )
}

function renderSpecsForm() {
  render(
    <ConfigStoreProvider>
      <RoomForm />
      <LayoutForm />
      <SpeakerSpecsForm />
      <StoredSubwooferGroup />
      <SetRmsElsewhere />
    </ConfigStoreProvider>,
  )
}

function storedGroup(): Config['speakerGroups']['subwoofers'] {
  return JSON.parse(
    screen.getByRole('status').textContent ?? '',
  ) as Config['speakerGroups']['subwoofers']
}

/** The fieldset of the Subwoofers group's specs, or of one subwoofer's own. */
function specs(name: 'Subwoofers' | `Subwoofer ${number}`) {
  return screen.getByRole('group', { name })
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

function chooseSubwooferCount(count: string) {
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Subwoofers' })).getByRole(
      'radio',
      { name: count },
    ),
  )
}

describe('speaker specs form', () => {
  it('shows our default subwoofer specs, and says they are ours', () => {
    renderSpecsForm()
    const group = specs('Subwoofers')

    expect(within(group).getByRole('radio', { name: 'Sealed' })).toBeChecked()
    expect(
      within(group).getByRole('textbox', { name: 'Driver size (in)' }),
    ).toHaveValue('12')
    expect(
      within(group).getByRole('textbox', { name: 'RMS power (W)' }),
    ).toHaveValue('300')
    expect(
      within(group).getByRole('textbox', { name: 'Peak power (W)' }),
    ).toHaveValue('600')
    expect(
      screen.getByText(
        /^Starting values are ours: a sealed 12 in subwoofer with a 300 W RMS \(600 W peak\) amplifier/,
      ),
    ).toBeInTheDocument()
  })

  it('shows the driver size in inches in both unit systems, as subwoofers are sold by the inch', () => {
    renderSpecsForm()
    const driver = () =>
      within(specs('Subwoofers')).getByRole('textbox', {
        name: 'Driver size (in)',
      })
    type(driver(), '15')

    fireEvent.click(screen.getByRole('radio', { name: 'Imperial (ft + in)' }))
    expect(driver()).toHaveValue('15')

    fireEvent.click(screen.getByRole('radio', { name: 'Metric (m)' }))
    expect(driver()).toHaveValue('15')
  })

  it('stores valid specs for every subwoofer, the driver size in meters', () => {
    renderSpecsForm()
    const group = specs('Subwoofers')

    fireEvent.click(within(group).getByRole('radio', { name: 'Ported' }))
    type(within(group).getByRole('textbox', { name: 'Driver size (in)' }), '15')
    type(within(group).getByRole('textbox', { name: 'Peak power (W)' }), '1600')
    type(within(group).getByRole('textbox', { name: 'RMS power (W)' }), '800')

    expect(storedGroup().specs).toEqual({
      enclosure: 'ported',
      driverDiameter: 0.381,
      rmsWatts: 800,
      peakWatts: 1600,
    })
  })

  it('explains a spec out of range inline and keeps the last valid value', () => {
    renderSpecsForm()
    const group = specs('Subwoofers')
    const driver = within(group).getByRole('textbox', {
      name: 'Driver size (in)',
    })
    const rms = within(group).getByRole('textbox', { name: 'RMS power (W)' })

    type(driver, '30')
    type(rms, '5')

    expect(driver).toHaveAccessibleDescription(
      'Driver size must be between 6 in and 24 in.',
    )
    expect(rms).toHaveAccessibleDescription(
      'RMS power must be between 10 W and 10,000 W.',
    )
    expect(rms).toBeInvalid()
    expect(storedGroup().specs).toMatchObject({
      driverDiameter: 12 * 0.0254,
      rmsWatts: 300,
    })

    type(rms, 'loud')
    expect(rms).toHaveAccessibleDescription('Enter the RMS power as a number.')
  })

  it('needs the peak power to be at least the RMS power, and stores both once they agree', () => {
    renderSpecsForm()
    const group = specs('Subwoofers')
    const rms = within(group).getByRole('textbox', { name: 'RMS power (W)' })
    const peak = within(group).getByRole('textbox', { name: 'Peak power (W)' })

    type(rms, '800')

    expect(rms).toHaveAccessibleDescription(
      "RMS power can't be above the peak power (600 W).",
    )
    expect(peak).toHaveAccessibleDescription(
      "Peak power can't be below the RMS power (800 W).",
    )
    expect(storedGroup().specs.rmsWatts).toBe(300)

    type(peak, '1600')

    expect(rms).toHaveAccessibleDescription('')
    expect(peak).toHaveAccessibleDescription('')
    expect(storedGroup().specs).toMatchObject({
      rmsWatts: 800,
      peakWatts: 1600,
    })
  })

  it('keeps an invalid entry, with its error, while another spec is stored', () => {
    renderSpecsForm()
    const group = specs('Subwoofers')
    const rms = within(group).getByRole('textbox', { name: 'RMS power (W)' })

    type(rms, '5')
    type(within(group).getByRole('textbox', { name: 'Driver size (in)' }), '15')

    expect(rms).toHaveValue('5')
    expect(rms).toHaveAccessibleDescription(
      'RMS power must be between 10 W and 10,000 W.',
    )
    expect(storedGroup().specs).toMatchObject({
      driverDiameter: 0.381,
      rmsWatts: 300,
    })
  })

  it('starts over from the stored specs when they change elsewhere', () => {
    renderSpecsForm()
    const rms = within(specs('Subwoofers')).getByRole('textbox', {
      name: 'RMS power (W)',
    })
    type(rms, '5')

    fireEvent.click(screen.getByRole('button', { name: 'Set 450 W elsewhere' }))

    expect(rms).toHaveValue('450')
    expect(rms).toHaveAccessibleDescription('')
  })

  it('offers specs per subwoofer only with more than one subwoofer', () => {
    renderSpecsForm()

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    chooseSubwooferCount('2')

    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(
      screen.getByRole('checkbox', { name: 'Subwoofer 2 has its own specs' }),
    ).not.toBeChecked()
  })

  it('lets one subwoofer have specs of its own, starting from the group specs, and give them up', () => {
    renderSpecsForm()
    chooseSubwooferCount('2')
    const ownSpecs = screen.getByRole('checkbox', {
      name: 'Subwoofer 2 has its own specs',
    })

    fireEvent.click(ownSpecs)

    const second = specs('Subwoofer 2')
    expect(
      within(second).getByRole('textbox', { name: 'RMS power (W)' }),
    ).toHaveValue('300')

    type(within(second).getByRole('textbox', { name: 'RMS power (W)' }), '450')
    fireEvent.click(within(second).getByRole('radio', { name: 'Ported' }))

    expect(storedGroup()).toEqual({
      specs: {
        enclosure: 'sealed',
        driverDiameter: 12 * 0.0254,
        rmsWatts: 300,
        peakWatts: 600,
      },
      ownSpecs: {
        Sub2: {
          enclosure: 'ported',
          driverDiameter: 12 * 0.0254,
          rmsWatts: 450,
          peakWatts: 600,
        },
      },
    })

    fireEvent.click(ownSpecs)

    expect(
      screen.queryByRole('group', { name: 'Subwoofer 2' }),
    ).not.toBeInTheDocument()
    expect(storedGroup().ownSpecs).toEqual({})
  })
})
