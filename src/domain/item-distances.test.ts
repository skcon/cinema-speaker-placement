import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG, itemDistances } from '@/domain'

describe('distances of an item to the walls and the MLP', () => {
  it('gives Left in the default room its distances to the front and left walls and to the MLP', () => {
    // The default room is 6 m long and 4.5 m wide. The auto MLP is at 38%
    // of the length, y = 0.38 × 6 = 2.28 m, on the center line, at ear
    // height 1.2 m. Left is auto-placed at -26° (the middle of Dolby's
    // 22°–30°) at the reference distance: the MLP to the front wall's
    // 0.3 m clearance line, 2.28 − 0.3 = 1.98 m, also at ear height. So
    //   x = −1.98 × sin 26° = −1.98 × 0.43837 = −0.86798 m
    //   y = 2.28 − 1.98 × cos 26° = 2.28 − 1.98 × 0.89879 = 0.50039 m
    // and it is
    //   0.50039 m from the front wall (nearer than the back wall, 5.49961 m),
    //   2.25 − 0.86798 = 1.38202 m from the left wall (the right is 3.11798 m),
    //   1.98 m from the MLP (the same height, so the reference distance).
    const { mlp, speakers } = analyzeRoom(DEFAULT_CONFIG)
    const left = speakers.find(({ channel }) => channel === 'L')!

    const distances = itemDistances(DEFAULT_CONFIG.room, left.position, mlp)

    const [along, across] = distances.walls
    expect(along.wall).toBe('front')
    expect(along.meters).toBeCloseTo(0.50039, 4)
    expect(across.wall).toBe('left')
    expect(across.meters).toBeCloseTo(1.38202, 4)
    expect(distances.mlp?.meters).toBeCloseTo(1.98, 4)
  })

  it('draws each wall line straight to its wall, and the MLP line to the MLP', () => {
    const room = { length: 6, width: 4.5, height: 2.6 }
    const item = { x: -1, y: 0.5, z: 1.2 }
    const mlp = { x: 0, y: 2.28, z: 1.2 }

    const { walls, mlp: toMlp } = itemDistances(room, item, mlp)

    // Straight up to the front wall (y = 0) and left to the left wall
    // (x = −2.25), at the item's own height.
    expect(walls[0]).toEqual({
      wall: 'front',
      from: item,
      to: { x: -1, y: 0, z: 1.2 },
      meters: 0.5,
    })
    expect(walls[1]).toEqual({
      wall: 'left',
      from: item,
      to: { x: -2.25, y: 0.5, z: 1.2 },
      meters: 1.25,
    })
    // √(1² + 1.78²) = √(1 + 3.1684) = √4.1684 = 2.04167 m.
    expect(toMlp?.from).toEqual(item)
    expect(toMlp?.to).toEqual(mlp)
    expect(toMlp?.meters).toBeCloseTo(2.04167, 4)
  })

  it('measures the walls an item is nearer to, here the back and right walls', () => {
    const room = { length: 6, width: 4.5, height: 2.6 }

    const { walls } = itemDistances(room, { x: 1.8, y: 5.4, z: 0.3 }, null)

    expect(walls[0]).toMatchObject({ wall: 'back', to: { x: 1.8, y: 6 } })
    expect(walls[0].meters).toBeCloseTo(0.6, 9)
    expect(walls[1]).toMatchObject({ wall: 'right', to: { x: 2.25, y: 5.4 } })
    expect(walls[1].meters).toBeCloseTo(0.45, 9)
  })

  it('measures an overhead speaker to the walls in plan and to the MLP in 3D', () => {
    const room = { length: 6, width: 4.5, height: 2.6 }
    const overhead = { x: -1, y: 2, z: 2.6 }
    const mlp = { x: 0, y: 2.28, z: 1.2 }

    const { walls, mlp: toMlp } = itemDistances(room, overhead, mlp)

    // In plan: 2 m from the front wall, 2.25 − 1 = 1.25 m from the left.
    expect(walls[0]).toMatchObject({ wall: 'front', meters: 2 })
    expect(walls[1]).toMatchObject({ wall: 'left', meters: 1.25 })
    // √(1² + 0.28² + 1.4²) = √(1 + 0.0784 + 1.96) = √3.0384 = 1.74310 m.
    expect(toMlp?.meters).toBeCloseTo(1.7431, 4)
  })

  it('has no MLP line for the MLP itself', () => {
    const { mlp } = analyzeRoom(DEFAULT_CONFIG)

    const distances = itemDistances(DEFAULT_CONFIG.room, mlp, null)

    expect(distances.mlp).toBeNull()
    // 2.28 m from the front wall, 2.25 m from the left (halfway: left counts).
    expect(distances.walls[0]).toMatchObject({ wall: 'front' })
    expect(distances.walls[0].meters).toBeCloseTo(2.28, 9)
    expect(distances.walls[1]).toMatchObject({ wall: 'left', meters: 2.25 })
  })
})
