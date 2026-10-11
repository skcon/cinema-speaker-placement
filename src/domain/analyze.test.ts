import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG, type Config } from '@/domain'

function configWithRoom(room: Config['room']): Config {
  return { ...DEFAULT_CONFIG, room }
}

describe('the default config', () => {
  it('is metric with the default 6 x 4.5 x 2.6 m room', () => {
    expect(DEFAULT_CONFIG).toEqual({
      units: 'metric',
      room: { length: 6, width: 4.5, height: 2.6 },
    })
  })
})

describe('the MLP before auto-place', () => {
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
