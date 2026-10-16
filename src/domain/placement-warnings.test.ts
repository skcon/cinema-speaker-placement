import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { DEFAULT_CONFIG, type Config } from './config'
import type { FurnitureBox } from './furniture'
import type { Opening } from './openings'
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

/** EMPTY with these openings. */
function withOpenings(...openings: Opening[]): WarningInput {
  return { ...EMPTY, roomObjects: { ...DEFAULT_ROOM_OBJECTS, openings } }
}

/**
 * A 0.9 m door in the middle of the back wall: x from -0.45 to 0.45 at
 * y = 6, its swing zone 0.9 m deep (y from 5.1 to 6).
 */
const DOOR: Opening = { kind: 'door', wall: 'back', position: 2.25, width: 0.9 }

/**
 * A 1.2 m window on the right wall (x = 2.25): y from 2.4 to 3.6, from
 * 0.9 m up to 2.1 m.
 */
const WINDOW: Opening = {
  kind: 'window',
  wall: 'right',
  position: 3,
  width: 1.2,
  sill: 0.9,
  height: 1.2,
}

/** Left Rear Surround at ear height, its woofer 0.15 m lower. */
function leftRear(x: number, y: number) {
  return {
    channel: 'Lrs',
    name: 'Left Rear Surround',
    position: { x, y, z: 1.2 },
    woofer: { x, y, z: 1.05 },
  } as const
}

/** Subwoofer 1 on the floor plan, at subwoofer height. */
function subwoofer(x: number, y: number) {
  return {
    id: 'Sub1',
    name: 'Subwoofer 1',
    position: { x, y, z: 0.3 },
  } as const
}

describe('W1: a speaker blocks a door', () => {
  it('warns about a speaker where the door swings, as our own rule', () => {
    const warnings = placementWarnings({
      ...withOpenings(DOOR),
      speakers: [leftRear(0.2, 5.6)],
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W1',
        items: ['Lrs', 'opening-1'],
        message:
          'Left Rear Surround is in front of Door (opening 1), where the door swings.',
        sourceClass: 'ours',
        citations: [],
      }),
    ])
  })

  it('clears when the speaker moves out of the swing zone, to the side or forward', () => {
    for (const [x, y] of [
      [0.6, 5.6],
      [0.2, 5],
    ] as const) {
      expect(
        placementWarnings({
          ...withOpenings(DOOR),
          speakers: [leftRear(x, y)],
        }),
      ).toEqual([])
    }
  })

  it('warns about a subwoofer in the swing zone too', () => {
    expect(
      placementWarnings({
        ...withOpenings(DOOR),
        subwoofers: [subwoofer(-0.3, 5.2)],
      }).map(({ id, items }) => [id, items]),
    ).toEqual([['W1', ['Sub1', 'opening-1']]])
  })

  it('stays quiet for a window', () => {
    expect(
      placementWarnings({
        ...withOpenings({ ...WINDOW, wall: 'back', position: 2.25 }),
        subwoofers: [subwoofer(0, 5.7)],
      }),
    ).toEqual([])
  })
})

describe('W2: a speaker in front of a window', () => {
  /** Right Surround 0.5 m off the right wall, in front of the window. */
  const RIGHT_SURROUND = {
    channel: 'Rs',
    name: 'Right Surround',
    position: { x: 1.75, y: 3, z: 1.2 },
    woofer: { x: 1.75, y: 3, z: 1.05 },
  } as const

  it('warns as community practice, labelled as common advice', () => {
    const warnings = placementWarnings({
      ...withOpenings(WINDOW),
      speakers: [RIGHT_SURROUND],
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W2',
        items: ['Rs', 'opening-1'],
        message:
          'Right Surround is in front of Window (opening 1): the glass reflects mids and treble and lets bass through, unlike the wall beside it.',
        sourceClass: 'community',
        note: expect.stringMatching(/Common advice, not a rule/) as unknown,
      }),
    ])
  })

  it('stays quiet more than 1 m from the window, beside it, or below its sill', () => {
    const away = (position: { x: number; y: number; z: number }) => ({
      ...RIGHT_SURROUND,
      position,
      woofer: { ...position, z: position.z - 0.15 },
    })
    for (const speaker of [
      away({ x: 1.2, y: 3, z: 1.2 }),
      away({ x: 1.75, y: 3.7, z: 1.2 }),
      away({ x: 1.75, y: 3, z: 0.8 }),
    ]) {
      expect(
        placementWarnings({ ...withOpenings(WINDOW), speakers: [speaker] }),
      ).toEqual([])
    }
  })

  it('warns for a woofer at the window even when the tweeter is above it', () => {
    const high = { ...WINDOW, sill: 0.5, height: 0.6 }

    expect(
      placementWarnings({
        ...withOpenings(high),
        speakers: [RIGHT_SURROUND],
      }).map(({ id }) => id),
    ).toEqual(['W2'])
  })

  it('leaves subwoofers and doors out', () => {
    // In front of a door on the right wall, 0.5 m to 1.5 m back: only W1.
    const atDoor = {
      ...RIGHT_SURROUND,
      position: { x: 1.75, y: 1, z: 1.2 },
      woofer: { x: 1.75, y: 1, z: 1.05 },
    }

    expect(
      placementWarnings({
        ...withOpenings(WINDOW, { ...DOOR, wall: 'right', position: 1 }),
        subwoofers: [subwoofer(2, 3)],
        speakers: [atDoor],
      }).map(({ id }) => id),
    ).toEqual(['W1'])
  })
})

describe('W3: a subwoofer in or near a doorway', () => {
  it('warns within 0.5 m of the door, saying the estimate assumes a closed wall', () => {
    // 0.35 m right of the door's edge and 0.2 m out: 0.40 m from it.
    const warnings = placementWarnings({
      ...withOpenings(DOOR),
      subwoofers: [subwoofer(0.8, 5.8)],
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W3',
        items: ['Sub1', 'opening-1'],
        message:
          'Subwoofer 1 is in or near Door (opening 1): bass may leak into the next room, and the estimated response assumes a closed wall there.',
        sourceClass: 'community',
      }),
    ])
  })

  it('stays quiet 0.6 m away, or near a window', () => {
    // 0.55 m right of the door's edge and 0.2 m out: 0.59 m from it.
    expect(
      placementWarnings({
        ...withOpenings(DOOR),
        subwoofers: [subwoofer(1, 5.8)],
      }),
    ).toEqual([])
    expect(
      placementWarnings({
        ...withOpenings(WINDOW),
        subwoofers: [subwoofer(2, 3)],
      }),
    ).toEqual([])
  })

  it('warns as well as W1 for a subwoofer in the doorway', () => {
    expect(
      placementWarnings({
        ...withOpenings(DOOR),
        subwoofers: [subwoofer(0, 5.7)],
      }).map(({ id }) => id),
    ).toEqual(['W1', 'W3'])
  })
})

describe('W5: left and right reflections differ', () => {
  /**
   * Left and Right 1.5 m either side of the centre line, 0.5 m from the
   * front wall, at ear height: seen from the MLP 4 m back, each one's
   * reflection off its own side wall is 1.375 m from the front wall, and
   * off the far side wall 2.6875 m.
   */
  const FRONT_PAIR = [
    {
      channel: 'L',
      name: 'Left',
      position: { x: -1.5, y: 0.5, z: 1.2 },
      woofer: { x: -1.5, y: 0.5, z: 1.05 },
    },
    {
      channel: 'R',
      name: 'Right',
      position: { x: 1.5, y: 0.5, z: 1.2 },
      woofer: { x: 1.5, y: 0.5, z: 1.05 },
    },
  ] as const

  /** A window on the left wall from 0.8 m to 2 m from the front wall. */
  const LEFT_WINDOW: Opening = { ...WINDOW, wall: 'left', position: 1.4 }

  it('warns when a window is at one side reflection point but not at the mirror one', () => {
    const warnings = placementWarnings({
      ...withOpenings(LEFT_WINDOW),
      speakers: FRONT_PAIR,
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        id: 'W5',
        items: ['L', 'R', 'opening-1'],
        message:
          "Left and right reflect differently: Window (opening 1) is at Left's reflection point on the left wall, but Right's on the right wall is plain wall.",
        sourceClass: 'standard',
        citations: expect.arrayContaining([
          expect.objectContaining({ source: 'EBU-3276-S1' }),
        ]) as unknown,
      }),
    ])
  })

  it('stays quiet when the mirror point has an opening too', () => {
    expect(
      placementWarnings({
        ...withOpenings(LEFT_WINDOW, { ...DOOR, wall: 'right', position: 1.5 }),
        speakers: FRONT_PAIR,
      }),
    ).toEqual([])
  })

  it('checks the reflection off the far side wall too', () => {
    // A door on the right wall from 2.3 m to 3.2 m: Left's reflection off
    // it, at 2.6875 m, but not Right's off the left wall.
    expect(
      placementWarnings({
        ...withOpenings({ ...DOOR, wall: 'right', position: 2.75 }),
        speakers: FRONT_PAIR,
      }).map(({ id, items }) => [id, items]),
    ).toEqual([['W5', ['L', 'R', 'opening-1']]])
  })

  it('stays quiet when the opening is above or beside the reflection point', () => {
    for (const opening of [
      { ...LEFT_WINDOW, sill: 1.3 },
      { ...LEFT_WINDOW, position: 4 },
    ]) {
      expect(
        placementWarnings({ ...withOpenings(opening), speakers: FRONT_PAIR }),
      ).toEqual([])
    }
  })

  it('needs both speakers of the pair', () => {
    expect(
      placementWarnings({
        ...withOpenings(LEFT_WINDOW),
        speakers: [FRONT_PAIR[0]],
      }),
    ).toEqual([])
  })
})

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
    '%s cites sources the app can show, with a title and a link, unless it is our own',
    (_, { sourceClass, citations }) => {
      if (sourceClass !== 'ours') expect(citations.length).toBeGreaterThan(0)
      for (const citation of citations) {
        expect(sourceOf(citation.source)).toEqual({
          title: expect.any(String) as unknown,
          url: expect.stringMatching(/^https:\/\//) as unknown,
        })
      }
    },
  )

  it('label the distances that are our own assumptions', () => {
    expect(PLACEMENT_WARNINGS.W1.note).toMatch(/are our assumption/)
    expect(PLACEMENT_WARNINGS.W2.note).toMatch(
      /1 m of the window is our assumption/,
    )
    expect(PLACEMENT_WARNINGS.W3.note).toMatch(/0\.5 m is our assumption/)
    expect(PLACEMENT_WARNINGS.W6.note).toMatch(/0\.3 m is our assumption/)
    expect(PLACEMENT_WARNINGS.W7.note).toMatch(/0\.6 m is our assumption/)
  })
})
