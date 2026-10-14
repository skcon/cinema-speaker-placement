import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type SpeakerGroupId,
} from '@/domain'

/**
 * The default 5.1.2 room with every item moved by hand to round distances
 * from the MLP at (0, 3, 1.2): Left and Right 2 m away, the Center 1 m,
 * the surrounds 3 m, and Subwoofer 1 1.5 m (1.2 m along, 0.9 m down).
 * Front and surrounds 87 dB, the Center 90 dB.
 */
const MEASURED: Config = {
  ...DEFAULT_CONFIG,
  speakerGroups: {
    ...DEFAULT_CONFIG.speakerGroups,
    front: { specs: { type: 'bookshelf', sensitivity: 87 } },
    center: { specs: { type: 'bookshelf', sensitivity: 90 } },
    surrounds: { specs: { type: 'bookshelf', sensitivity: 87 } },
  },
  manualPositions: {
    MLP: { x: 0, y: 3, z: 1.2 },
    L: { x: -1.2, y: 1.4, z: 1.2 },
    R: { x: 1.2, y: 1.4, z: 1.2 },
    C: { x: 0, y: 2, z: 1.2 },
    Ls: { x: -1.8, y: 5.4, z: 1.2 },
    Rs: { x: 1.8, y: 5.4, z: 1.2 },
    Sub1: { x: 0, y: 1.8, z: 0.3 },
  },
}

/** A speaker group's headroom row, which must have placed speakers. */
function placedGroup(config: Config, group: SpeakerGroupId) {
  const row = analyzeRoom(config).headroom.groups.find((g) => g.group === group)
  if (!row?.placed) throw new Error(`${group} has no placed speakers`)
  return row
}

describe('headroom at the MLP', () => {
  // Reference level: 82 dB SPL(C) at −20 dBFS (IG p.15), so 102 dB peaks
  // per channel, and the LFE 10 dB above (ATSC A/52), 112 dB.
  it('checks the speakers against 102 dB and the subwoofers against 112 dB peaks, from the reference level', () => {
    const { headroom } = analyzeRoom(MEASURED)

    expect(headroom).toMatchObject({
      referenceLevelDb: 82,
      peakAboveReferenceDb: 20,
      referencePeakDb: 102,
      lfeGainDb: 10,
      enoughFromDb: 3,
    })
    expect(headroom.subwoofers.targetDb).toBe(112)
  })

  it('lists every speaker group the layout uses, in form order', () => {
    const groups = (config: Config) =>
      analyzeRoom(config).headroom.groups.map(({ group }) => group)

    expect(groups(MEASURED)).toEqual([
      'front',
      'center',
      'surrounds',
      'overheads',
    ])
    expect(
      groups({
        ...DEFAULT_CONFIG,
        layout: { dolbyLayout: '2.1', subwoofers: 1 },
      }),
    ).toEqual(['front'])
    expect(
      groups({
        ...DEFAULT_CONFIG,
        layout: { dolbyLayout: '7.1.4', subwoofers: 1 },
      }),
    ).toEqual(['front', 'center', 'surrounds', 'rearSurrounds', 'overheads'])
  })

  it('works out each speaker from its sensitivity, the amplifier power and its distance', () => {
    const channels = analyzeRoom(MEASURED).headroom.groups.flatMap(
      ({ channels }) => channels,
    )
    const byChannel = Object.fromEntries(channels.map((c) => [c.channel, c]))

    // 87 dB + 10·log10(100 W) − 20·log10(2 m) = 100.98 dB
    expect(byChannel.L!.distance).toBeCloseTo(2, 9)
    expect(byChannel.L!.maxSpl).toBeCloseTo(100.9794, 4)
    expect(byChannel.L!.headroomDb).toBeCloseTo(-1.0206, 4)
    // 90 dB + 20 dB − 0 dB at 1 m
    expect(byChannel.C!.maxSpl).toBeCloseTo(110, 9)
    expect(byChannel.C!.headroomDb).toBeCloseTo(8, 9)
    // 87 dB + 20 dB − 20·log10(3 m) = 97.46 dB
    expect(byChannel.Ls!.maxSpl).toBeCloseTo(97.4576, 4)
  })

  it('gives a group its weakest speaker, its headroom, a status, and the power for 3 dB to spare', () => {
    const front = placedGroup(MEASURED, 'front')

    expect(front).toMatchObject({ name: 'Front L/R', status: 'short' })
    expect(front.weakest.channel).toBe('L')
    expect(front.headroomDb).toBeCloseTo(-1.0206, 4)
    // 87 + 10·log10(P) − 6.0206 = 105 → P = 10^2.40206 = 252.38 W
    expect(front.wattsForEnough).toBeCloseTo(252.38, 1)
    expect(placedGroup(MEASURED, 'center').status).toBe('enough')
    expect(placedGroup(MEASURED, 'surrounds').headroomDb).toBeCloseTo(
      -4.5424,
      4,
    )
  })

  it('names the farther speaker as a group’s weakest', () => {
    const config: Config = {
      ...MEASURED,
      // Right Surround moved from 3 m to 3.5 m behind the MLP's side.
      manualPositions: {
        ...MEASURED.manualPositions,
        Rs: { x: 1.8, y: 5.7, z: 1.2 },
      },
    }

    expect(placedGroup(config, 'surrounds').weakest.channel).toBe('Rs')
  })

  it('gains 3 dB everywhere when the amplifier power doubles', () => {
    const at = (amplifierWatts: number) =>
      placedGroup({ ...MEASURED, amplifierWatts }, 'front').headroomDb

    expect(at(200) - at(100)).toBeCloseTo(3.0103, 4)
  })

  it('follows a speaker moved further away: 6 dB less at twice the distance', () => {
    const moved: Config = {
      ...MEASURED,
      // Center from 1 m to 2 m in front of the MLP.
      manualPositions: {
        ...MEASURED.manualPositions,
        C: { x: 0, y: 1, z: 1.2 },
      },
    }

    expect(
      placedGroup(MEASURED, 'center').headroomDb -
        placedGroup(moved, 'center').headroomDb,
    ).toBeCloseTo(6.0206, 4)
  })

  it('estimates a sealed 12 in, 300 W subwoofer 1.5 m away at 109.25 dB, short of 112 dB', () => {
    const { subwoofers } = analyzeRoom(MEASURED).headroom

    // 88 dB (ours) + 10·log10(300) − 20·log10(1.5) = 88 + 24.7712 − 3.5218
    expect(subwoofers.subwoofers[0]!.distance).toBeCloseTo(1.5, 9)
    expect(subwoofers.maxSpl).toBeCloseTo(109.2494, 4)
    expect(subwoofers.headroomDb).toBeCloseTo(-2.7506, 4)
    expect(subwoofers.status).toBe('short')
  })

  it('uses a subwoofer’s RMS power, not its peak power', () => {
    const peakier: Config = {
      ...MEASURED,
      speakerGroups: {
        ...MEASURED.speakerGroups,
        subwoofers: {
          ...MEASURED.speakerGroups.subwoofers,
          specs: {
            ...MEASURED.speakerGroups.subwoofers.specs,
            peakWatts: 2400,
          },
        },
      },
    }

    expect(analyzeRoom(peakier).headroom.subwoofers.maxSpl).toBeCloseTo(
      109.2494,
      4,
    )
  })

  it('adds subwoofers as a power sum, each with its own specs', () => {
    const two: Config = {
      ...MEASURED,
      layout: { dolbyLayout: '5.1.2', subwoofers: 2 },
      speakerGroups: {
        ...MEASURED.speakerGroups,
        subwoofers: {
          ...MEASURED.speakerGroups.subwoofers,
          ownSpecs: {
            // Ported 15 in: 88 + 20·log10(15/12) + 3 = 92.94 dB (ours).
            Sub2: {
              enclosure: 'ported',
              driverDiameter: 15 * 0.0254,
              rmsWatts: 300,
              peakWatts: 600,
            },
          },
        },
      },
      manualPositions: {
        ...MEASURED.manualPositions,
        Sub2: { x: 0, y: 4.2, z: 0.3 },
      },
    }
    const { subwoofers } = analyzeRoom(two).headroom

    // Sub2: 92.9382 + 24.7712 − 3.5218 = 114.1876 dB. Sum with 109.2494:
    // 114.1876 + 10·log10(1 + 10^(−0.49382)) = 114.1876 + 1.2084.
    expect(subwoofers.subwoofers[1]!.maxSpl).toBeCloseTo(114.1876, 4)
    expect(subwoofers.maxSpl).toBeCloseTo(115.396, 3)
    expect(subwoofers.status).toBe('enough')
  })

  it('lists a group without placed speakers (the overheads, until they are placed) as not placed, with its specs', () => {
    const overheads = analyzeRoom(MEASURED).headroom.groups.find(
      (g) => g.group === 'overheads',
    )

    expect(overheads).toEqual({
      group: 'overheads',
      name: 'Overheads',
      specs: { sensitivity: 88 },
      channels: [],
      placed: false,
    })
  })

  it('reads tight, not short, for the first-visit room', () => {
    const { groups } = analyzeRoom(DEFAULT_CONFIG).headroom

    expect(groups.flatMap((g) => (g.placed ? [g.status] : []))).toEqual([
      'tight',
      'tight',
      'tight',
    ])
  })
})

describe('bookshelf and tower speakers', () => {
  const withFronts = (type: 'bookshelf' | 'tower'): Config => ({
    ...DEFAULT_CONFIG,
    speakerGroups: {
      ...DEFAULT_CONFIG.speakerGroups,
      front: { specs: { type, sensitivity: 87 } },
    },
  })
  const left = (config: Config) =>
    analyzeRoom(config).speakers.find(({ channel }) => channel === 'L')!

  it('both put the tweeter at Dolby’s 1.2 m ear height', () => {
    expect(left(withFronts('bookshelf')).position.z).toBe(1.2)
    expect(left(withFronts('tower')).position.z).toBe(1.2)
  })

  it('put the woofer 0.15 m below it in a bookshelf and 0.8 m below it in a tower (ours)', () => {
    expect(left(withFronts('bookshelf')).woofer.z).toBeCloseTo(1.05, 9)
    expect(left(withFronts('tower')).woofer.z).toBeCloseTo(0.4, 9)
    expect(left(withFronts('tower')).woofer.x).toBe(
      left(withFronts('tower')).position.x,
    )
  })

  it('keeps a woofer at least 0.1 m above the floor', () => {
    const low: Config = {
      ...withFronts('tower'),
      manualPositions: { L: { x: -1, y: 1, z: 0.5 } },
    }
    expect(left(low).woofer.z).toBeCloseTo(0.1, 9)
  })

  it('change the estimated response, as the woofer’s floor reflection moves', () => {
    const rows = (config: Config) =>
      analyzeRoom(config).response.estimated.rows.map((r) => r.estimated)
    const bookshelf = rows(withFronts('bookshelf'))
    const tower = rows(withFronts('tower'))

    const largest = Math.max(
      ...bookshelf.map((level, i) => Math.abs(level - tower[i]!)),
    )
    expect(largest).toBeGreaterThan(1)
  })
})
