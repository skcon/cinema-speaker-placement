import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { DEFAULT_CONFIG, type Config } from './config'
import type { FurnitureBox } from './furniture'
import {
  placementWarnings,
  warningsAbout,
  type WarningInput,
} from './placement-warnings'
import { PLACEMENT_WARNINGS, sourceOf } from './reference'
import { DEFAULT_ROOM_OBJECTS } from './room-objects'
import { DEFAULT_ROOM } from './room'

/**
 * The default 6 x 4.5 x 2.6 m room with the MLP 4 m from the front wall
 * at ear height, and no speakers yet: each test adds what it needs.
 */
const EMPTY: WarningInput = {
  room: DEFAULT_ROOM,
  roomObjects: DEFAULT_ROOM_OBJECTS,
  mlp: { x: 0, y: 4, z: 1.2 },
  speakers: [],
  overheads: [],
  subwoofers: [],
}

/** A furniture box named `name`, unturned. */
function box(
  name: string,
  { x, y, width, depth, height }: Omit<FurnitureBox, 'name' | 'rotation'>,
): FurnitureBox {
  return { name, width, depth, height, x, y, rotation: 0 }
}

/** EMPTY with these furniture boxes. */
function furnished(...furniture: FurnitureBox[]): WarningInput {
  return { ...EMPTY, roomObjects: { ...DEFAULT_ROOM_OBJECTS, furniture } }
}

/**
 * Left Surround 2 m left of the MLP, level with it: its direct sound runs
 * along y = 4 at 1.2 m, from x = -2 to x = 0.
 */
const LEFT_SURROUND = {
  channel: 'Ls',
  name: 'Left Surround',
  position: { x: -2, y: 4, z: 1.2 },
  woofer: { x: -2, y: 4, z: 1.05 },
} as const

/**
 * A 0.3 m wide, 0.5 m deep shelf between them: x from -1.15 to -0.85, y
 * from 3.75 to 4.25.
 */
const SHELF_AT = { x: -1, y: 4, width: 0.3, depth: 0.5 } as const

describe('W4: furniture blocks the direct sound', () => {
  it('warns when a box taller than the sound path stands in it', () => {
    const warnings = placementWarnings({
      ...furnished(box('Shelf', { ...SHELF_AT, height: 1.8 })),
      speakers: [LEFT_SURROUND],
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W4',
        items: ['Ls', 'furniture-1'],
        message:
          'Shelf (box 1) blocks the direct sound from Left Surround to the MLP.',
        sourceClass: 'standard',
        citations: expect.arrayContaining([
          expect.objectContaining({ source: 'EBU-3276' }),
        ]) as unknown,
      }),
    ])
  })

  it('stays quiet when the box is lower than the path (1.2 m) or beside it', () => {
    expect(
      placementWarnings({
        ...furnished(
          // Low enough for W6 too: the woofer is 0.35 m above it.
          box('Table', { ...SHELF_AT, height: 0.7 }),
          // Beside the path: y from 4.3 to 4.8.
          box('Shelf', { ...SHELF_AT, y: 4.55, height: 1.8 }),
        ),
        speakers: [LEFT_SURROUND],
      }),
    ).toEqual([])
  })

  it('warns about a speaker standing inside a box', () => {
    expect(
      placementWarnings({
        ...furnished(
          box('Cabinet', { x: -2, y: 4, width: 0.6, depth: 0.6, height: 1.5 }),
        ),
        speakers: [LEFT_SURROUND],
      }).map(({ id }) => id),
    ).toEqual(['W4'])
  })

  it('checks overhead speakers along their slanted path', () => {
    // Top front left at (-1, 2) on the 2.6 m ceiling: halfway to the MLP
    // its sound is at (-0.5, 3, 1.9).
    const overhead = {
      channel: 'Ltf',
      name: 'Left Top Front',
      position: { x: -1, y: 2, z: 2.6 },
    } as const
    const tall = { x: -0.5, y: 3, width: 0.4, depth: 0.4 } as const

    expect(
      placementWarnings({
        ...furnished(box('Bookcase', { ...tall, height: 2 })),
        overheads: [overhead],
      }).map(({ items }) => items),
    ).toEqual([['Ltf', 'furniture-1']])
    // Over x from -0.7 to -0.3 the path is 2.04 m down to 1.76 m up:
    // above a 1.7 m box.
    expect(
      placementWarnings({
        ...furnished(box('Bookcase', { ...tall, height: 1.7 })),
        overheads: [overhead],
      }),
    ).toEqual([])
  })

  it('exempts subwoofers: bass is little affected by obstacles', () => {
    expect(
      placementWarnings({
        ...furnished(box('Shelf', { ...SHELF_AT, height: 1.8 })),
        subwoofers: [
          {
            id: 'Sub1',
            name: 'Subwoofer 1',
            position: { x: -2, y: 4, z: 0.3 },
          },
        ],
      }),
    ).toEqual([])
  })

  it('warns once for each speaker and box', () => {
    const warnings = placementWarnings({
      ...furnished(
        box('Shelf', { ...SHELF_AT, height: 1.8 }),
        box('Plant', { ...SHELF_AT, x: -0.5, height: 1.5 }),
      ),
      speakers: [LEFT_SURROUND],
    })

    expect(warnings.map(({ items }) => items)).toEqual([
      ['Ls', 'furniture-1'],
      ['Ls', 'furniture-2'],
    ])
    expect(warningsAbout(warnings, 'furniture-2')).toHaveLength(1)
    expect(warningsAbout(warnings, 'Ls')).toHaveLength(2)
    expect(warningsAbout(warnings, 'MLP')).toEqual([])
  })
})

describe('W6: a speaker just above a cabinet top', () => {
  /** Left on the front stage, 0.5 m from the front wall. */
  const LEFT = {
    channel: 'L',
    name: 'Left',
    position: { x: -1, y: 0.5, z: 1.2 },
    woofer: { x: -1, y: 0.5, z: 1.05 },
  } as const
  /** A cabinet under Left: x from -1.3 to -0.7, y from 0.3 to 0.7. */
  const UNDER = { x: -1, y: 0.5, width: 0.6, depth: 0.4 } as const

  it('warns when its tweeter is within 0.3 m above the top, the box toward the MLP', () => {
    // Tweeter 0.2 m above the 1 m top.
    const warnings = placementWarnings({
      ...furnished(box('Cabinet', { ...UNDER, height: 1 })),
      speakers: [LEFT],
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W6',
        items: ['L', 'furniture-1'],
        message:
          'Left is just above the top of Cabinet (box 1), which reflects its sound to the MLP.',
        sourceClass: 'manufacturer',
      }),
    ])
  })

  it('warns for the woofer too', () => {
    // Tweeter 0.4 m above a 0.8 m top, but the woofer only 0.25 m.
    expect(
      placementWarnings({
        ...furnished(box('Desk', { ...UNDER, height: 0.8 })),
        speakers: [LEFT],
      }).map(({ id }) => id),
    ).toEqual(['W6'])
  })

  it('stays quiet more than 0.3 m above the top', () => {
    // Tweeter 0.5 m and woofer 0.35 m above a 0.7 m top.
    expect(
      placementWarnings({
        ...furnished(box('Cabinet', { ...UNDER, height: 0.7 })),
        speakers: [LEFT],
      }),
    ).toEqual([])
  })

  it('stays quiet for a box beside the speaker, not toward the MLP', () => {
    // At x from -2.2 to -1.6: left of Left, away from the MLP at x = 0.
    expect(
      placementWarnings({
        ...furnished(box('Cabinet', { ...UNDER, x: -1.9, height: 1 })),
        speakers: [LEFT],
      }),
    ).toEqual([])
  })

  it('warns for a box in front of the speaker, toward the MLP', () => {
    // Between Left (-1, 0.5) and the MLP (0, 4): at y = 1.5 the path is
    // at x = -0.714, inside x from -1 to -0.4.
    expect(
      placementWarnings({
        ...furnished(
          box('Table', { x: -0.7, y: 1.5, width: 0.6, depth: 0.4, height: 1 }),
        ),
        speakers: [LEFT],
      }).map(({ id }) => id),
    ).toEqual(['W6'])
  })
})

describe('W7: the MLP close to the back wall', () => {
  it('warns closer than 0.6 m to the back wall, saying the bass part is already in the estimate', () => {
    const warnings = placementWarnings({
      ...EMPTY,
      mlp: { x: 0, y: 5.5, z: 1.2 },
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W7',
        items: ['MLP'],
        sourceClass: 'community',
        message: expect.stringContaining(
          'already in the estimated response',
        ) as unknown,
      }),
    ])
  })

  it('stays quiet 0.7 m away', () => {
    expect(
      placementWarnings({ ...EMPTY, mlp: { x: 0, y: 5.3, z: 1.2 } }),
    ).toEqual([])
  })
})

describe('placement warnings in the analysis', () => {
  it('are none in the default room', () => {
    expect(analyzeRoom(DEFAULT_CONFIG).placementWarnings).toEqual([])
  })

  it('follow the placed speakers and MLP, and leave the estimate as it is', () => {
    // A 2 m bookcase right in front of the auto MLP (2.28 m from the
    // front wall), between it and the front stage.
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: {
        ...DEFAULT_ROOM_OBJECTS,
        furniture: [
          {
            name: 'Bookcase',
            width: 4.5,
            depth: 0.3,
            height: 2,
            x: 0,
            y: 1.5,
            rotation: 0,
          },
        ],
      },
    }
    const analysis = analyzeRoom(config)

    expect(
      analysis.placementWarnings
        .filter(({ id }) => id === 'W4')
        .map(({ items }) => items[0]),
    ).toEqual(['L', 'C', 'R'])
    expect(analysis.response).toEqual(analyzeRoom(DEFAULT_CONFIG).response)
  })

  it('warn about an MLP dragged against the back wall', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 5.6, z: 1.2 } },
    }

    expect(analyzeRoom(config).placementWarnings.map(({ id }) => id)).toContain(
      'W7',
    )
  })
})

describe("the warnings' sources", () => {
  it.each(Object.entries(PLACEMENT_WARNINGS))(
    '%s cites sources the app can show, with a title and a link',
    (_, { citations }) => {
      expect(citations.length).toBeGreaterThan(0)
      for (const citation of citations) {
        expect(sourceOf(citation.source)).toEqual({
          title: expect.any(String) as unknown,
          url: expect.stringMatching(/^https:\/\//) as unknown,
        })
      }
    },
  )

  it('label the distances that are our own assumptions', () => {
    expect(PLACEMENT_WARNINGS.W6.note).toMatch(/0\.3 m is our assumption/)
    expect(PLACEMENT_WARNINGS.W7.note).toMatch(/0\.6 m is our assumption/)
  })
})
