import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG, type Config } from '@/domain'
import {
  interferenceLevels,
  type BoundaryReflection,
} from './boundary-interference'
import type { HeardMode, ResponseRow } from './estimated-response'
import {
  responseNotes,
  type NotedSpeaker,
  type ResponseNotesInput,
} from './response-notes'
import { summarizeResponse } from './response-summary'
import type { RoomMode } from './room-modes'

/** 20-500 Hz like the chart, 160 steps per decade. */
const FREQUENCIES = Array.from({ length: 225 }, (_, i) => 20 * 10 ** (i / 160))

/**
 * Rows on the flat target, with `bumps` added: a bell of `db` dB at `hz`,
 * a sixth of an octave wide.
 */
function rows(
  bumps: { hz: number; db: number }[] = [],
  reliableFrom = 20,
): ResponseRow[] {
  return FREQUENCIES.map((frequency) => {
    const estimated = bumps.reduce(
      (sum, { hz, db }) =>
        sum + db * Math.exp(-((Math.log2(frequency / hz) / (1 / 6)) ** 2)),
      0,
    )
    return {
      frequency,
      estimated,
      target: 0,
      low: -3,
      high: 3,
      reliable: frequency >= reliableFrom,
    }
  })
}

function axial(
  dimension: 'length' | 'width' | 'height',
  order: number,
  frequency: number,
): RoomMode {
  return {
    indices: {
      length: dimension === 'length' ? order : 0,
      width: dimension === 'width' ? order : 0,
      height: dimension === 'height' ? order : 0,
    },
    kind: 'axial',
    frequency,
  }
}

function heard(mode: RoomMode, atReceiver: number, excited = true): HeardMode {
  return { mode, atReceiver, excited }
}

function reflection(
  surface: BoundaryReflection['surface'],
  firstNotch: number,
  relativeLevel = 0.8,
): BoundaryReflection {
  const c = 343
  return {
    surface,
    pathDifference: c / (2 * firstNotch),
    relativeLevel,
    notchFrequencies: [firstNotch, 3 * firstNotch, 5 * firstNotch],
  }
}

/** A speaker as a test writes it: its levels follow from its reflections. */
type TestSpeaker = Omit<NotedSpeaker, 'levels'>

type Overrides = Partial<Omit<ResponseNotesInput, 'speakers'>> & {
  speakers?: TestSpeaker[]
}

function input({ speakers = [], ...overrides }: Overrides): ResponseNotesInput {
  const base = rows()
  return {
    rows: base,
    summary: summarizeResponse(base),
    crossoverHz: 80,
    modalBandwidth: 4.4,
    roomModes: [],
    enclosures: ['sealed'],
    ...overrides,
    speakers: speakers.map((speaker) => ({
      ...speaker,
      levels: interferenceLevels(speaker.reflections, FREQUENCIES),
    })),
  }
}

function withRows(
  bumps: { hz: number; db: number }[],
  overrides: Overrides = {},
  reliableFrom = 20,
): ResponseNotesInput {
  const chart = rows(bumps, reliableFrom)
  return input({ rows: chart, summary: summarizeResponse(chart), ...overrides })
}

describe('weaknesses on the chart', () => {
  it('names a peak at a length mode the subwoofers excite and the MLP hears: "length mode at 43 Hz"', () => {
    const { weaknesses } = responseNotes(
      withRows([{ hz: 43, db: 7 }], {
        roomModes: [heard(axial('length', 1, 42.9), 0.9)],
      }),
    )

    expect(weaknesses).toEqual([
      {
        kind: 'peak',
        frequency: expect.closeTo(43, 0) as number,
        deviation: expect.closeTo(7, 0) as number,
        cause: { kind: 'room-mode', mode: axial('length', 1, 42.9) },
        speakers: [],
      },
    ])
  })

  it('names a dip above the crossover at a reflection notch of the Left and Right speakers: "front-wall reflection notch at 140 Hz"', () => {
    const { weaknesses } = responseNotes(
      withRows([{ hz: 140, db: -8 }], {
        speakers: [
          {
            name: 'Left',
            charted: true,
            reflections: [reflection('front wall', 141)],
          },
          {
            name: 'Right',
            charted: true,
            reflections: [reflection('front wall', 141)],
          },
        ],
      }),
    )

    expect(weaknesses[0]).toMatchObject({
      kind: 'dip',
      frequency: expect.closeTo(140, 0) as number,
      cause: { kind: 'reflection', effect: 'notch', surfaces: ['front wall'] },
      speakers: ['Left', 'Right'],
    })
  })

  it('names a dip below the crossover where the MLP sits on a mode’s node', () => {
    const { weaknesses } = responseNotes(
      withRows([{ hz: 57, db: -9 }], {
        roomModes: [heard(axial('length', 2, 57.2), 0.02)],
      }),
    )

    expect(weaknesses[0]?.cause).toEqual({
      kind: 'mode-null',
      mode: axial('length', 2, 57.2),
    })
  })

  it('ignores a mode the subwoofers cancel when naming a peak', () => {
    const { weaknesses } = responseNotes(
      withRows([{ hz: 43, db: 7 }], {
        roomModes: [heard(axial('length', 1, 42.9), 0.9, false)],
      }),
    )

    expect(weaknesses[0]?.cause).toEqual({ kind: 'modes-combined' })
  })

  it('puts a dip near the bottom down to the enclosure roll-off when no mode explains it', () => {
    const { weaknesses } = responseNotes(withRows([{ hz: 30, db: -6 }]))

    expect(weaknesses[0]?.cause).toEqual({
      kind: 'enclosure-roll-off',
      enclosure: 'sealed',
    })
  })

  it('lists only what leaves the ±3 dB band, one entry per peak or dip, largest first', () => {
    const { weaknesses } = responseNotes(
      withRows([
        { hz: 45, db: 5 },
        { hz: 70, db: 2.5 },
        { hz: 150, db: -9 },
      ]),
    )

    expect(weaknesses.map((w) => [w.kind, Math.round(w.frequency)])).toEqual([
      ['dip', 150],
      ['peak', 45],
    ])
  })

  it('skips a peak or dip deepest at an edge of the chart, whose center lies outside it', () => {
    const { weaknesses } = responseNotes(
      withRows(
        [
          // A dip centered above the chart, and a peak below its reliable rows.
          { hz: 560, db: -9 },
          { hz: 26, db: 8 },
          { hz: 150, db: -6 },
        ],
        {},
        28.6,
      ),
    )

    expect(weaknesses.map((w) => Math.round(w.frequency))).toEqual([150])
  })

  it('skips the unreliable rows below the lowest excited mode', () => {
    const { weaknesses } = responseNotes(
      withRows([{ hz: 24, db: -15 }], {}, 28.6),
    )

    expect(weaknesses).toEqual([])
  })
})

describe('reflection notches of the other speakers', () => {
  it('lists a speaker’s own notch deeper than 3 dB, with its surface', () => {
    const { weaknesses } = responseNotes(
      input({
        speakers: [
          {
            name: 'Center',
            charted: false,
            reflections: [reflection('front wall', 180, 0.8)],
          },
        ],
      }),
    )

    expect(weaknesses).toEqual([
      {
        kind: 'dip',
        frequency: expect.closeTo(180, -1) as number,
        deviation: expect.any(Number) as number,
        cause: {
          kind: 'reflection',
          effect: 'notch',
          surfaces: ['front wall'],
        },
        speakers: ['Center'],
      },
    ])
    expect(weaknesses[0]!.deviation).toBeLessThan(-3)
  })

  it('merges a mirrored pair into one entry: the Left and Right Surround side-wall notches', () => {
    const { weaknesses } = responseNotes(
      input({
        speakers: [
          {
            name: 'Left Surround',
            charted: false,
            reflections: [reflection('left wall', 200)],
          },
          {
            name: 'Right Surround',
            charted: false,
            reflections: [reflection('right wall', 200)],
          },
        ],
      }),
    )

    expect(weaknesses).toHaveLength(1)
    expect(weaknesses[0]).toMatchObject({
      speakers: ['Left Surround', 'Right Surround'],
      cause: { surfaces: ['left wall', 'right wall'] },
    })
  })

  it('lists only each speaker’s deepest notch', () => {
    // A floor reflection with notches at 100, 300 and 500 Hz.
    const { weaknesses } = responseNotes(
      input({
        speakers: [
          {
            name: 'Center',
            charted: false,
            reflections: [reflection('floor', 100)],
          },
        ],
      }),
    )

    expect(weaknesses).toHaveLength(1)
  })

  it('skips a notch below the crossover, where the subwoofers play', () => {
    // Notches at 170 Hz and 510 Hz: neither from 200 Hz to the top of the band.
    const center = (crossoverHz: number) =>
      responseNotes(
        input({
          crossoverHz,
          speakers: [
            {
              name: 'Center',
              charted: false,
              reflections: [reflection('floor', 170)],
            },
          ],
        }),
      ).weaknesses

    expect(center(200)).toEqual([])
    expect(center(80)).toHaveLength(1)
  })
})

describe('strengths', () => {
  it('calls the response smooth when at least 70% of the reliable range is inside the band', () => {
    const { strengths } = responseNotes(input({}))

    expect(strengths).toContainEqual({
      kind: 'smooth',
      withinTolerance: 1,
      from: 20,
      to: expect.closeTo(502.4, 1) as number,
    })
  })

  it('names first-order axial modes the subwoofers cancel', () => {
    const { strengths } = responseNotes(
      input({
        roomModes: [
          heard(axial('length', 1, 28.6), 1, false),
          heard(axial('length', 2, 57.2), 1, false),
          heard(axial('width', 1, 38.1), 0, true),
        ],
      }),
    )

    expect(strengths).toContainEqual({
      kind: 'mode-cancelled',
      mode: axial('length', 1, 28.6),
    })
    expect(strengths).toHaveLength(2)
  })

  it('names the speakers clear of reflection notches deeper than 3 dB', () => {
    const { strengths } = responseNotes(
      input({
        speakers: [
          { name: 'Left', charted: true, reflections: [] },
          {
            name: 'Center',
            charted: false,
            reflections: [reflection('front wall', 180, 0.9)],
          },
          {
            name: 'Left Surround',
            charted: false,
            reflections: [reflection('left wall', 200, 0.1)],
          },
        ],
      }),
    )

    expect(strengths).toContainEqual({
      kind: 'no-deep-notch',
      speakers: ['Left', 'Left Surround'],
    })
  })
})

describe('notes for a room', () => {
  const twoSubwoofers: Config = {
    ...DEFAULT_CONFIG,
    layout: { ...DEFAULT_CONFIG.layout, subwoofers: 2 },
  }

  it('finds the default Left and Right speakers’ front-wall reflection notch near c/(2Δ) ≈ 184 Hz', () => {
    const { response, speakers, mlp } = analyzeRoom(DEFAULT_CONFIG)
    const notch = response.notes.weaknesses.find(
      (w) =>
        w.cause.kind === 'reflection' &&
        w.cause.surfaces.includes('front wall'),
    )
    // The Left speaker and its image behind the front wall, seen from the MLP.
    const { x, y } = speakers.find((s) => s.channel === 'L')!.position
    const direct = Math.hypot(x - mlp.x, y - mlp.y)
    const image = Math.hypot(x - mlp.x, -y - mlp.y)

    expect(notch?.frequency).toBeCloseTo(343 / (2 * (image - direct)), -1)
    expect(notch?.speakers).toEqual(['Left', 'Right'])
  })

  it('lists the charted speakers’ notches only through the chart, and the others’ own', () => {
    const { weaknesses } = analyzeRoom(DEFAULT_CONFIG).response.notes
    const own = weaknesses.filter((w) => w.speakers.includes('Center'))

    // The Center is charted: its reflections shape the chart, not a list entry of its own.
    expect(own.filter((w) => w.speakers.length === 1)).toEqual([])
    expect(weaknesses.some((w) => w.speakers.includes('Left Surround'))).toBe(
      true,
    )
  })

  it('credits front and back subwoofers with cancelling the first length mode (28.6 Hz) and, on the center line, the first width mode', () => {
    const { strengths } = analyzeRoom(twoSubwoofers).response.notes
    const cancelled = strengths.flatMap((s) =>
      s.kind === 'mode-cancelled' ? [s.mode] : [],
    )

    expect(cancelled).toEqual([
      expect.objectContaining({
        indices: { length: 1, width: 0, height: 0 },
        frequency: expect.closeTo(343 / 12, 6) as number,
      }),
      expect.objectContaining({ indices: { length: 0, width: 1, height: 0 } }),
    ])
  })

  it('leaves out the default room’s dip at the chart’s top row, 502 Hz, which only runs into the edge', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)
    const top = response.estimated.rows.at(-1)!
    // The chart does end below its ±3 dB band there.
    expect(top.estimated).toBeLessThan(top.low)

    expect(response.notes.weaknesses).not.toContainEqual(
      expect.objectContaining({ frequency: top.frequency }),
    )
  })

  it('lists nothing from below the reliable range', () => {
    const { response } = analyzeRoom(twoSubwoofers)
    const reliableFrom = response.estimated.reliableFrom!
    for (const weakness of response.notes.weaknesses) {
      expect(weakness.frequency).toBeGreaterThanOrEqual(reliableFrom)
    }
  })
})
