import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  formatLayout,
  V1_DOLBY_LAYOUTS,
  type Config,
} from '@/domain'

function configWithRoom(room: Config['room']): Config {
  return { ...DEFAULT_CONFIG, room }
}

function configWithLayout(layout: Config['layout']): Config {
  return { ...DEFAULT_CONFIG, layout }
}

describe('the default config', () => {
  it('is metric with the default 6 x 4.5 x 2.6 m room, a 5.1.2 layout, our default subwoofer specs, the flat target curve and an 80 Hz crossover', () => {
    expect(DEFAULT_CONFIG).toEqual({
      units: 'metric',
      room: { length: 6, width: 4.5, height: 2.6 },
      layout: { dolbyLayout: '5.1.2', subwoofers: 1 },
      speakerGroups: {
        subwoofers: {
          specs: {
            enclosure: 'sealed',
            // 12 in
            driverDiameter: 12 * 0.0254,
            rmsWatts: 300,
            peakWatts: 600,
          },
          ownSpecs: {},
        },
      },
      targetCurve: 'flat',
      crossoverHz: 80,
    })
  })
})

describe('listener-level speakers', () => {
  it('places the 5.1.2 listener-level channels for the default config, named as Dolby names them', () => {
    const { speakers } = analyzeRoom(DEFAULT_CONFIG)

    expect(speakers.map(({ channel, name }) => [channel, name])).toEqual([
      ['L', 'Left'],
      ['C', 'Center'],
      ['R', 'Right'],
      ['Ls', 'Left Surround'],
      ['Rs', 'Right Surround'],
    ])
  })

  it.each([
    ['2.1', ['L', 'R']],
    ['3.1', ['L', 'C', 'R']],
    ['5.1', ['L', 'C', 'R', 'Ls', 'Rs']],
    ['7.1', ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs']],
    ['5.1.2', ['L', 'C', 'R', 'Ls', 'Rs']],
    ['5.1.4', ['L', 'C', 'R', 'Ls', 'Rs']],
    ['7.1.2', ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs']],
    ['7.1.4', ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs']],
  ] as const)(
    'places only the listener-level channels of %s',
    (dolbyLayout, channels) => {
      const { speakers } = analyzeRoom(
        configWithLayout({ dolbyLayout, subwoofers: 1 }),
      )

      expect(speakers.map(({ channel }) => channel)).toEqual(channels)
    },
  )

  it('uses the same listener-level channels whatever the subwoofer count', () => {
    const channels = (subwoofers: 1 | 4) =>
      analyzeRoom(
        configWithLayout({ dolbyLayout: '7.1.4', subwoofers }),
      ).speakers.map(({ channel }) => channel)

    expect(channels(4)).toEqual(channels(1))
  })
})

describe('layouts', () => {
  it('offers the eight v1 Dolby layouts, listener-level only first', () => {
    expect(V1_DOLBY_LAYOUTS).toEqual([
      '2.1',
      '3.1',
      '5.1',
      '7.1',
      '5.1.2',
      '5.1.4',
      '7.1.2',
      '7.1.4',
    ])
  })

  it('writes each Dolby layout with one subwoofer as Dolby names it', () => {
    expect(
      V1_DOLBY_LAYOUTS.map((dolbyLayout) =>
        formatLayout({ dolbyLayout, subwoofers: 1 }),
      ),
    ).toEqual(V1_DOLBY_LAYOUTS)
  })

  it('writes a layout as X.Y.Z with its subwoofer count as Y, leaving out .Z without overheads', () => {
    expect(formatLayout({ dolbyLayout: '7.1.4', subwoofers: 2 })).toBe('7.2.4')
    expect(formatLayout({ dolbyLayout: '5.1', subwoofers: 4 })).toBe('5.4')
  })

  it('reports the X.Y.Z counts of the analyzed layout', () => {
    expect(
      analyzeRoom(configWithLayout({ dolbyLayout: '7.1.2', subwoofers: 3 }))
        .layout,
    ).toEqual({ name: '7.3.2', listenerLevel: 7, subwoofers: 3, overheads: 2 })
  })
})

describe('the MLP before the recommended seat exists', () => {
  it('sits 38% of the room length from the front wall, centered, at ear height', () => {
    const { mlp } = analyzeRoom(DEFAULT_CONFIG)

    expect(mlp.x).toBe(0)
    expect(mlp.y).toBeCloseTo(2.28, 9)
    expect(mlp.z).toBe(1.2)
  })

  it('follows the room length', () => {
    const room = { width: 4.5, height: 2.6 }
    expect(analyzeRoom(configWithRoom({ ...room, length: 10 })).mlp.y).toBe(3.8)
    expect(
      analyzeRoom(configWithRoom({ ...room, length: 15 })).mlp.y,
    ).toBeCloseTo(5.7, 9)
  })

  it('stays centered side to side and at ear height whatever the width and ceiling', () => {
    const { mlp } = analyzeRoom(
      configWithRoom({ length: 6, width: 3.7, height: 4.2 }),
    )
    expect(mlp.x).toBe(0)
    expect(mlp.z).toBe(1.2)
  })
})
