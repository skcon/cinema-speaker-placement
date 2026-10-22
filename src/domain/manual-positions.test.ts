import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  placeManually,
  positionLengths,
  wallDistances,
  withPositionLength,
  type ChannelId,
  type Config,
  type RoomAnalysis,
} from '@/domain'

function speaker(analysis: RoomAnalysis, channel: ChannelId) {
  const found = analysis.speakers.find((s) => s.channel === channel)
  if (!found) throw new Error(`no ${channel} speaker`)
  return found
}

/** The default 5.1.2 room (6 x 4.5 x 2.6 m, MLP at x 0, y 2.28 m). */
const ROOM = DEFAULT_CONFIG

describe('manual positions in the room plan', () => {
  it('put a manual speaker where it was left, and mark it manual', () => {
    const config: Config = {
      ...ROOM,
      manualPositions: { R: { x: 1.5, y: 1, z: 1.5 } },
    }

    const right = speaker(analyzeRoom(config), 'R')

    expect(right.position).toEqual({ x: 1.5, y: 1, z: 1.5 })
    expect(right.placement).toBe('manual')
    expect(speaker(analyzeRoom(config), 'L').placement).toBe('auto')
  })

  it('re-grade a manual speaker from where it is: Right moved out to 37° is acceptable', () => {
    // From the MLP at (0, 2.28), a point 1.28 m ahead and tan(37°) * 1.28 m
    // to the right is at 37°: past the ideal 22°–30°, inside 40°.
    const config: Config = {
      ...ROOM,
      manualPositions: {
        R: { x: Math.tan((37 * Math.PI) / 180) * 1.28, y: 1, z: 1.2 },
      },
    }

    const { placementRange } = speaker(analyzeRoom(config), 'R')

    expect(placementRange.azimuth.shown).toBe(37)
    expect(placementRange.grade).toBe('acceptable')
  })

  it('aim a manual speaker at the MLP', () => {
    // Straight to the right of the MLP, so it faces left (-90°).
    const config: Config = {
      ...ROOM,
      manualPositions: { R: { x: 2, y: 2.28, z: 1.2 } },
    }

    expect(speaker(analyzeRoom(config), 'R').aim.yaw).toBeCloseTo(-90, 9)
  })

  it('move the MLP to its manual position, and auto speakers follow it while manual ones stay', () => {
    const moved: Config = {
      ...ROOM,
      manualPositions: {
        MLP: { x: 0, y: 3, z: 1.2 },
        L: { x: -1, y: 0.5, z: 1.2 },
      },
    }

    const before = analyzeRoom(ROOM)
    const after = analyzeRoom(moved)

    expect(after.mlp).toEqual({ x: 0, y: 3, z: 1.2 })
    expect(after.mlpPlacement).toBe('manual')
    expect(before.mlpPlacement).toBe('auto')
    // The Center still sits at the screen; Right follows the MLP back and
    // stays at 26°.
    expect(speaker(after, 'R').position).not.toEqual(
      speaker(before, 'R').position,
    )
    expect(speaker(after, 'R').placementRange.azimuth.shown).toBe(26)
    expect(speaker(after, 'L').position).toEqual({ x: -1, y: 0.5, z: 1.2 })
  })

  it('put a manual subwoofer where it was left, against its nearest wall', () => {
    const config: Config = {
      ...ROOM,
      manualPositions: { Sub1: { x: 1.9, y: 4, z: 0.3 } },
    }

    const [sub] = analyzeRoom(config).subwoofers

    expect(sub?.position).toEqual({ x: 1.9, y: 4, z: 0.3 })
    expect(sub?.wall).toBe('right')
    expect(sub?.placement).toBe('manual')
  })
})

describe('placing an item by hand', () => {
  it('stores the new position as manual, keeping the coordinates not given', () => {
    const config = placeManually(ROOM, 'R', { x: 1.5, y: 1 })

    // Right was auto at ear height, 1.2 m.
    expect(config.manualPositions).toEqual({ R: { x: 1.5, y: 1, z: 1.2 } })
  })

  it('keeps a speaker 0.3 m from every wall, the floor and the ceiling (our clearance)', () => {
    const config = placeManually(ROOM, 'R', { x: 9, y: -2, z: 4 })

    const { x, y, z } = config.manualPositions.R ?? { x: 0, y: 0, z: 0 }
    expect([x, y, z]).toEqual([1.95, 0.3, expect.closeTo(2.3, 9)])
  })

  it('keeps a subwoofer on the floor and the MLP at ear height', () => {
    const config = placeManually(
      placeManually(ROOM, 'Sub1', { x: -9, y: 9, z: 2 }),
      'MLP',
      { x: 0.5, y: 3, z: 2 },
    )

    expect(config.manualPositions).toEqual({
      Sub1: { x: -1.95, y: 5.7, z: 0.3 },
      MLP: { x: 0.5, y: 3, z: 1.2 },
    })
  })

  it('ignores a height change for a subwoofer or the MLP, whose heights are fixed', () => {
    expect(placeManually(ROOM, 'Sub1', { z: 1 })).toBe(ROOM)
    expect(placeManually(ROOM, 'MLP', { z: 1.5 })).toBe(ROOM)
  })

  it('ignores items the layout lacks and coordinates that are not numbers', () => {
    // The default 5.1.2 has no rear surrounds and one subwoofer.
    expect(placeManually(ROOM, 'Lrs', { x: 1 })).toBe(ROOM)
    expect(placeManually(ROOM, 'Sub2', { x: 1 })).toBe(ROOM)
    expect(placeManually(ROOM, 'R', { x: Number.NaN })).toBe(ROOM)
  })
})

describe('wall distances of a speaker', () => {
  it('are measured to the nearest side wall and the nearest end wall', () => {
    // 4.5 m wide, 6 m long.
    expect(wallDistances(ROOM.room, { x: 1.5, y: 1, z: 1.2 })).toEqual({
      across: { wall: 'right', meters: 0.75 },
      along: { wall: 'front', meters: 1 },
    })
    expect(wallDistances(ROOM.room, { x: -2, y: 5.5, z: 1.2 })).toEqual({
      across: { wall: 'left', meters: 0.25 },
      along: { wall: 'back', meters: 0.5 },
    })
  })

  it('move a speaker when one is set, making it manual', () => {
    const fromLeftWall = withPositionLength(ROOM, 'L', 'left', 0.5)
    const fromBackWall = withPositionLength(fromLeftWall, 'L', 'back', 0.4)

    expect(fromLeftWall.manualPositions.L?.x).toBeCloseTo(-1.75, 9)
    expect(fromBackWall.manualPositions.L?.y).toBeCloseTo(5.6, 9)
    expect(fromBackWall.manualPositions.L?.x).toBeCloseTo(-1.75, 9)
  })
})

describe('the lengths of an item a field edits', () => {
  // The default room: 4.5 m wide, 6 m long, 2.6 m high.
  it("give a speaker's height and distances to its nearest walls, each with the range its clearances allow", () => {
    const lengths = positionLengths(ROOM.room, 'R', { x: 1.5, y: 1, z: 1.2 })

    // 0.3 m from the floor and the ceiling.
    expect(lengths.height?.meters).toBe(1.2)
    expect(lengths.height?.limits.min).toBeCloseTo(0.3, 9)
    expect(lengths.height?.limits.max).toBeCloseTo(2.3, 9)
    // 0.3 m from each wall: the width or length less both clearances.
    const [along, across] = lengths.walls
    expect(along.wall).toBe('front')
    expect(along.meters).toBe(1)
    expect(along.limits.min).toBeCloseTo(0.3, 9)
    expect(along.limits.max).toBeCloseTo(5.7, 9)
    expect(across.wall).toBe('right')
    expect(across.meters).toBe(0.75)
    expect(across.limits.min).toBeCloseTo(0.3, 9)
    expect(across.limits.max).toBeCloseTo(4.2, 9)
  })

  it('give no height for items whose height is fixed: overheads, subwoofers and the MLP', () => {
    for (const id of ['Ltm', 'Sub1', 'MLP'] as const) {
      expect(positionLengths(ROOM.room, id, { x: 0, y: 3, z: 1 }).height).toBe(
        null,
      )
    }
  })

  it('use the clearances of the kind of item: a subwoofer keeps its own from the walls', () => {
    const [along] = positionLengths(ROOM.room, 'Sub1', {
      x: 0,
      y: 5,
      z: 0.3,
    }).walls

    expect(along.wall).toBe('back')
    expect(along.limits.min).toBeCloseTo(0.3, 9)
    expect(along.limits.max).toBeCloseTo(5.7, 9)
  })

  it('accept every value a drag could reach: the clamped position is inside the limits', () => {
    const clamped = placeManually(ROOM, 'R', { x: 9, y: -2, z: 4 })
    const position = clamped.manualPositions.R ?? { x: 0, y: 0, z: 0 }
    const { height, walls } = positionLengths(ROOM.room, 'R', position)

    for (const { meters, limits } of [...(height ? [height] : []), ...walls]) {
      expect(meters).toBeGreaterThanOrEqual(limits.min - 1e-9)
      expect(meters).toBeLessThanOrEqual(limits.max + 1e-9)
    }
  })
})

describe('setting one of an item’s lengths', () => {
  it('sets a speaker’s height, making it manual', () => {
    const config = withPositionLength(ROOM, 'C', 'height', 1.5)

    expect(config.manualPositions.C?.z).toBe(1.5)
  })

  it('rejects a value outside its range instead of moving the item to the limit', () => {
    expect(withPositionLength(ROOM, 'L', 'back', 0.1)).toBe(ROOM)
    expect(withPositionLength(ROOM, 'L', 'left', 4.3)).toBe(ROOM)
    expect(withPositionLength(ROOM, 'C', 'height', 2.5)).toBe(ROOM)
    expect(withPositionLength(ROOM, 'C', 'height', 0.2)).toBe(ROOM)
  })

  it('accepts the limits themselves', () => {
    const config = withPositionLength(ROOM, 'L', 'left', 0.3)

    expect(config.manualPositions.L?.x).toBeCloseTo(-1.95, 9)
  })

  it('rejects a height for an item whose height is fixed, a missing item, or text that is not a number', () => {
    expect(withPositionLength(ROOM, 'Sub1', 'height', 1)).toBe(ROOM)
    expect(withPositionLength(ROOM, 'MLP', 'height', 1.2)).toBe(ROOM)
    // The default 5.1.2 has no rear surrounds.
    expect(withPositionLength(ROOM, 'Lrs', 'left', 1)).toBe(ROOM)
    expect(withPositionLength(ROOM, 'R', 'front', Number.NaN)).toBe(ROOM)
  })
})
