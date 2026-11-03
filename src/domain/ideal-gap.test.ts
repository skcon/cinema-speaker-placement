import { describe, expect, it } from 'vitest'
import { idealGapMessage, type IdealGap, type IdealGapAngle } from './ideal-gap'

const TOP_FRONT_ELEVATION: IdealGapAngle = {
  angle: 'elevation',
  ideal: { min: 30, max: 55 },
}
const TOP_FRONT_AZIMUTH: IdealGapAngle = {
  angle: 'azimuth',
  ideal: { min: 30, max: 60 },
}

function gap(overrides: Partial<IdealGap>): IdealGap {
  return {
    channel: 'Ltf',
    angles: [TOP_FRONT_ELEVATION],
    together: false,
    walls: ['front'],
    ...overrides,
  }
}

describe('idealGapMessage', () => {
  it('names the speaker, the wall in the way and the angle with its ideal range', () => {
    expect(idealGapMessage(gap({}), 'mlp')).toBe(
      'Left Top Front (Ltf) has no position where every grade is ideal: the front wall is too close to the MLP for its ideal elevation (30°–55°).',
    )
  })

  it('says the room is too narrow when both side walls are in the way', () => {
    expect(
      idealGapMessage(
        gap({ angles: [TOP_FRONT_AZIMUTH], walls: ['right', 'left'] }),
        'mlp',
      ),
    ).toBe(
      'Left Top Front (Ltf) has no position where every grade is ideal: the room is too narrow for its ideal azimuth (30°–60°).',
    )
  })

  it('lists several walls, and the room too narrow with another wall', () => {
    expect(idealGapMessage(gap({ walls: ['front', 'left'] }), 'mlp')).toContain(
      'the front and left walls are too close to the MLP for',
    )
    expect(
      idealGapMessage(gap({ walls: ['front', 'right', 'left'] }), 'mlp'),
    ).toContain(
      'the room is too narrow and the front wall is too close to the MLP for',
    )
  })

  it('says when each angle fits alone but not both together, and when neither fits', () => {
    expect(
      idealGapMessage(
        gap({
          angles: [TOP_FRONT_AZIMUTH, TOP_FRONT_ELEVATION],
          together: true,
        }),
        'mlp',
      ),
    ).toContain(
      'for its ideal azimuth (30°–60°) and elevation (30°–55°) together.',
    )
    expect(
      idealGapMessage(
        gap({ angles: [TOP_FRONT_AZIMUTH, TOP_FRONT_ELEVATION] }),
        'mlp',
      ),
    ).toContain('for its ideal azimuth (30°–60°) or elevation (30°–55°).')
  })

  it('names a listener-level speaker, a one-angle range, and the seat the speakers stay installed for', () => {
    expect(
      idealGapMessage(
        {
          channel: 'C',
          angles: [{ angle: 'azimuth', ideal: { min: 0, max: 0 } }],
          together: false,
          walls: ['front'],
        },
        'installed-for',
      ),
    ).toBe(
      'Center (C) has no position where every grade is ideal: the front wall is too close to the seat the speakers stay installed for, for its ideal azimuth (0°).',
    )
  })
})
