import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG } from '@/domain'
import {
  boundaryInterference,
  boundaryReflections,
  reflectingSurfaces,
} from './boundary-interference'
import { decibels } from './complex'

const ROOM = { length: 6, width: 4.5, height: 2.6 }
const C = 343

describe('reflecting surfaces of a listener-level speaker', () => {
  it('are the wall behind it (from its aim), the nearest other wall and the nearer of floor and ceiling', () => {
    // Facing the back wall, 0.5 m from the front wall and 1 m from the left wall.
    const speaker = {
      position: { x: -1.25, y: 0.5, z: 1.2 },
      aim: { yaw: 180 },
    }
    expect(reflectingSurfaces(ROOM, speaker)).toEqual([
      'front wall',
      'left wall',
      'floor',
    ])
  })

  it('takes both side walls for a speaker on the center line, as neither is nearer', () => {
    const center = { position: { x: 0, y: 0.3, z: 1.2 }, aim: { yaw: 180 } }
    expect(reflectingSurfaces(ROOM, center)).toEqual([
      'front wall',
      'left wall',
      'right wall',
      'floor',
    ])
  })

  it('picks the ceiling when it is nearer than the floor', () => {
    const speaker = { position: { x: 0, y: 0.5, z: 2 }, aim: { yaw: 180 } }
    expect(reflectingSurfaces(ROOM, speaker)).toContain('ceiling')
  })

  it('takes the wall behind from the aim, not from the distances', () => {
    // Nearer the left wall (0.4 m) than the back wall (0.6 m), but facing
    // the front wall, so the back wall is behind it.
    const speaker = {
      position: { x: -1.85, y: 5.4, z: 1.2 },
      aim: { yaw: 0 },
    }
    expect(reflectingSurfaces(ROOM, speaker)).toEqual([
      'back wall',
      'left wall',
      'floor',
    ])
  })

  it('are the front wall, left wall and floor for the default Left speaker', () => {
    const { speakers } = analyzeRoom(DEFAULT_CONFIG)
    const left = speakers.find((s) => s.channel === 'L')!
    expect(reflectingSurfaces(ROOM, left)).toEqual([
      'front wall',
      'left wall',
      'floor',
    ])
  })
})

describe('boundary reflections', () => {
  // On the front wall's normal through the speaker: d = 0.3 m from the
  // wall, the receiver D = 2 m further out, at the same height.
  const speaker = { position: { x: 0, y: 0.3, z: 1.3 }, aim: { yaw: 180 } }
  const receiver = { x: 0, y: 2.3, z: 1.3 }

  it('travel 2d further than the direct sound off the wall behind, so the first notch is the quarter-wave one, f = c/(4d)', () => {
    const front = boundaryReflections(ROOM, speaker, receiver).find(
      (r) => r.surface === 'front wall',
    )!
    expect(front.pathDifference).toBeCloseTo(0.6, 12)
    expect(front.notchFrequencies[0]).toBeCloseTo(C / (4 * 0.3), 9)
    // Odd multiples after it: 3c/(4d), 5c/(4d).
    expect(front.notchFrequencies[1]).toBeCloseTo((3 * C) / (4 * 0.3), 9)
  })

  it('arrive weaker by the ratio of the path lengths (rigid surfaces)', () => {
    const front = boundaryReflections(ROOM, speaker, receiver).find(
      (r) => r.surface === 'front wall',
    )!
    expect(front.relativeLevel).toBeCloseTo(2 / 2.6, 12)
  })

  it('off the floor: a 1.3 m high speaker and ear make the image path √(2² + 2.6²)', () => {
    const floor = boundaryReflections(ROOM, speaker, receiver).find(
      (r) => r.surface === 'floor',
    )!
    const image = Math.hypot(2, 2.6)
    expect(floor.pathDifference).toBeCloseTo(image - 2, 12)
    expect(floor.notchFrequencies[0]).toBeCloseTo(C / (2 * (image - 2)), 9)
  })
})

describe('boundary interference', () => {
  it('cuts the level by 1 − r/r′ at the notch of a single reflection, and adds it half-way to the next', () => {
    const reflection = {
      surface: 'front wall' as const,
      pathDifference: 0.6,
      relativeLevel: 2 / 2.6,
      notchFrequencies: [],
    }
    const notch = C / (4 * 0.3)
    const [atNotch, atBoost] = boundaryInterference(
      [reflection],
      [notch, 2 * notch],
    )
    expect(decibels(atNotch!)).toBeCloseTo(20 * Math.log10(1 - 2 / 2.6), 9)
    expect(decibels(atBoost!)).toBeCloseTo(20 * Math.log10(1 + 2 / 2.6), 9)
  })

  it('is the direct sound alone (0 dB) without reflections', () => {
    expect(boundaryInterference([], [100, 200]).map(decibels)).toEqual([0, 0])
  })
})
