import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  LOW_CEILING_FOR_OVERHEADS,
  suggestsAtmosEnabledSpeakers,
  type Config,
} from '@/domain'

const WITH_OVERHEADS: Config['layout'] = { dolbyLayout: '7.1.4', subwoofers: 1 }
const WITHOUT_OVERHEADS: Config['layout'] = {
  dolbyLayout: '7.1',
  subwoofers: 1,
}

function roomWithHeight(height: number): Config['room'] {
  return { length: 6, width: 4.5, height }
}

describe('suggesting Atmos-enabled speakers for a low ceiling', () => {
  it('cites Dolby’s 8 ft ceiling as the threshold', () => {
    // 8 ft = 8 x 0.3048 m (WP p.7, IG p.12)
    expect(LOW_CEILING_FOR_OVERHEADS.meters).toBeCloseTo(2.4384, 10)
    expect(LOW_CEILING_FOR_OVERHEADS.citations).toEqual([
      expect.objectContaining({ source: 'WP', page: 7 }),
      expect.objectContaining({ source: 'IG', page: 12 }),
    ])
  })

  it('suggests them when the ceiling is exactly 8 ft and the layout has overheads', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2.4384), WITH_OVERHEADS),
    ).toBe(true)
  })

  it('suggests them for a ceiling below 8 ft', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2.2), WITH_OVERHEADS),
    ).toBe(true)
  })

  it('does not suggest them for a ceiling just above 8 ft', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2.45), WITH_OVERHEADS),
    ).toBe(false)
  })

  it('does not suggest them for a layout without overheads, however low the ceiling', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2), WITHOUT_OVERHEADS),
    ).toBe(false)
  })

  it('is part of the room analysis', () => {
    const low = { ...DEFAULT_CONFIG, room: roomWithHeight(2.4) }
    expect(analyzeRoom(low).suggestsAtmosEnabledSpeakers).toBe(true)
    expect(analyzeRoom(DEFAULT_CONFIG).suggestsAtmosEnabledSpeakers).toBe(false)
  })
})
