import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '@/domain'
import { roomDimensions } from '@/scene/dimensions'

describe('room dimensions in the sketch', () => {
  it('writes the width along the back wall and the length along the left wall, in metres', () => {
    // The default room is 6 m long and 4.5 m wide; room coordinates start
    // at the middle of the front wall, so the back wall's middle is at
    // y 6 and the left wall's middle at x -2.25, y 3.
    const [width, length] = roomDimensions(DEFAULT_CONFIG.room, 'metric')

    expect(width).toEqual({
      measures: 'width',
      at: { x: 0, y: 6, z: 0 },
      text: '4.5 m',
    })
    expect(length).toEqual({
      measures: 'length',
      at: { x: -2.25, y: 3, z: 0 },
      text: '6 m',
    })
  })

  it('writes them in feet and inches in imperial', () => {
    // 4.5 m = 177.17 in = 14 ft 9.2 in; 6 m = 236.22 in = 19 ft 8.2 in.
    const [width, length] = roomDimensions(DEFAULT_CONFIG.room, 'imperial')

    expect(width?.text).toBe('14 ft 9.2 in')
    expect(length?.text).toBe('19 ft 8.2 in')
  })

  it('follows the room size', () => {
    const [width, length] = roomDimensions(
      { length: 7.2, width: 3.1, height: 2.4 },
      'metric',
    )

    expect(width?.at).toEqual({ x: 0, y: 7.2, z: 0 })
    expect(width?.text).toBe('3.1 m')
    expect(length?.at).toEqual({ x: -1.55, y: 3.6, z: 0 })
    expect(length?.text).toBe('7.2 m')
  })
})
