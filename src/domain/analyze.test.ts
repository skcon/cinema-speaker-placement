import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  formatLayout,
  V1_DOLBY_LAYOUTS,
  type Config,
} from '@/domain'
import { prepareRoomResponse } from './estimated-response'
import { bearingTo } from './room'

function configWithRoom(room: Config['room']): Config {
  return { ...DEFAULT_CONFIG, room }
}

function configWithLayout(layout: Config['layout']): Config {
  return { ...DEFAULT_CONFIG, layout }
}

describe('the default config', () => {
  it('is metric with the default 6 x 4.5 x 2.6 m room, a 5.1.2 layout, our default speaker specs and 100 W amplifier, the flat target curve, an 80 Hz crossover and everything auto-placed', () => {
    const bookshelf87 = { specs: { type: 'bookshelf', sensitivity: 87 } }
    expect(DEFAULT_CONFIG).toEqual({
      units: 'metric',
      room: { length: 6, width: 4.5, height: 2.6 },
      layout: { dolbyLayout: '5.1.2', subwoofers: 1 },
      speakerGroups: {
        front: bookshelf87,
        center: bookshelf87,
        surrounds: bookshelf87,
        rearSurrounds: bookshelf87,
        overheads: { specs: { sensitivity: 87 } },
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
      amplifierWatts: 100,
      targetCurve: 'flat',
      crossoverHz: 80,
      manualPositions: {},
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

describe('the response follows manual positions', () => {
  const rows = (config: Config) => analyzeRoom(config).response.estimated.rows
  const levelsFrom = (config: Config, fromHz: number, toHz: number) =>
    rows(config)
      .filter((r) => r.frequency >= fromHz && r.frequency <= toHz)
      .map((r) => r.estimated)
  const largestChange = (a: number[], b: number[]) =>
    Math.max(...a.map((level, i) => Math.abs(level - b[i]!)))

  it('changes a dragged speaker’s reflections: the Left speaker pushed to the front wall changes the estimate above the crossover, and it still faces the MLP', () => {
    const { speakers } = analyzeRoom(DEFAULT_CONFIG)
    const left = speakers.find((s) => s.channel === 'L')!
    const dragged: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { L: { ...left.position, y: 0.3 } },
    }
    const analysis = analyzeRoom(dragged)
    const moved = analysis.speakers.find((s) => s.channel === 'L')!

    expect(moved.placement).toBe('manual')
    expect(moved.aim.yaw).toBeCloseTo(
      bearingTo(moved.position, analysis.mlp),
      9,
    )
    expect(
      largestChange(
        levelsFrom(dragged, 150, 500),
        levelsFrom(DEFAULT_CONFIG, 150, 500),
      ),
    ).toBeGreaterThan(1)
  })

  it('turns every speaker toward a moved MLP and changes their reflections', () => {
    const moved: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0.8, y: 3, z: 1.2 } },
    }
    const analysis = analyzeRoom(moved)

    for (const speaker of analysis.speakers) {
      expect(speaker.aim.yaw).toBeCloseTo(
        bearingTo(speaker.position, analysis.mlp),
        9,
      )
    }
    expect(rows(moved)).not.toEqual(rows(DEFAULT_CONFIG))
  })

  it('reuses the room-mode preparation when only the MLP moves', () => {
    const { subwoofers } = analyzeRoom(DEFAULT_CONFIG)
    const input = {
      room: DEFAULT_CONFIG.room,
      subwoofers: subwoofers.map((s) => ({
        position: s.position,
        enclosure: s.specs.enclosure,
      })),
      crossoverHz: DEFAULT_CONFIG.crossoverHz,
      frequencies: rows(DEFAULT_CONFIG).map((r) => r.frequency),
    }
    const prepared = prepareRoomResponse(input)

    analyzeRoom({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0.8, y: 3, z: 1.2 } },
    })

    expect(prepareRoomResponse(input)).toBe(prepared)
  })

  it('changes the room-mode sum for a manual subwoofer: Subwoofer 1 moved into the front left corner', () => {
    const cornered: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { Sub1: { x: -1.95, y: 0.3, z: 0.3 } },
    }
    const analysis = analyzeRoom(cornered)

    expect(analysis.subwoofers[0]!.placement).toBe('manual')
    // In the middle of the front wall it sits on the first width mode's
    // node; in a corner it excites that mode, so the width mode is no
    // longer cancelled and the bass changes.
    expect(analysis.response.notes.strengths).not.toContainEqual(
      expect.objectContaining({ kind: 'mode-cancelled' }),
    )
    expect(
      largestChange(
        levelsFrom(cornered, 30, 80),
        levelsFrom(DEFAULT_CONFIG, 30, 80),
      ),
    ).toBeGreaterThan(3)
  })
})
