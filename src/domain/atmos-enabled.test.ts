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
  it('uses the spec’s 2.4 m ceiling as the threshold, citing Dolby’s 8 ft', () => {
    // Dolby: 8 ft, about 2.44 m (WP p.7, IG p.12); spec #2 story 24: 2.4 m
    expect(LOW_CEILING_FOR_OVERHEADS.meters).toBe(2.4)
    expect(LOW_CEILING_FOR_OVERHEADS.citations).toEqual([
      expect.objectContaining({ source: 'WP', page: 7 }),
      expect.objectContaining({ source: 'IG', page: 12 }),
    ])
  })

  it('suggests them when the ceiling is exactly 2.4 m and the layout has overheads', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2.4), WITH_OVERHEADS),
    ).toBe(true)
  })

  it('suggests them for a ceiling below 2.4 m', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2.2), WITH_OVERHEADS),
    ).toBe(true)
  })

  it('does not suggest them for a ceiling just above 2.4 m', () => {
    expect(
      suggestsAtmosEnabledSpeakers(roomWithHeight(2.41), WITH_OVERHEADS),
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
