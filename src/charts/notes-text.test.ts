import { describe, expect, it } from 'vitest'
import type { RoomMode } from '@/domain'
import { strengthText, weaknessText } from '@/charts/notes-text'

const LENGTH_1: RoomMode = {
  indices: { length: 1, width: 0, height: 0 },
  kind: 'axial',
  frequency: 43.04,
}

describe('weakness text', () => {
  it('names a peak at a length mode', () => {
    expect(
      weaknessText({
        kind: 'peak',
        frequency: 43.2,
        deviation: 6.94,
        cause: { kind: 'room-mode', mode: LENGTH_1 },
        speakers: [],
      }),
    ).toBe('Peak at 43.2 Hz (+6.9 dB): likely the first length mode at 43 Hz.')
  })

  it('names a dip at a front-wall reflection notch of the Left and Right speakers', () => {
    expect(
      weaknessText({
        kind: 'dip',
        frequency: 140.4,
        deviation: -8.21,
        cause: {
          kind: 'reflection',
          effect: 'notch',
          surfaces: ['front wall'],
        },
        speakers: ['Left', 'Right'],
      }),
    ).toBe(
      'Dip at 140 Hz (−8.2 dB): likely a front-wall reflection notch (Left and Right).',
    )
  })

  it('calls the left and right walls together side walls', () => {
    expect(
      weaknessText({
        kind: 'dip',
        frequency: 200,
        deviation: -5,
        cause: {
          kind: 'reflection',
          effect: 'notch',
          surfaces: ['left wall', 'right wall'],
        },
        speakers: ['Left Surround', 'Right Surround'],
      }),
    ).toBe(
      'Dip at 200 Hz (−5.0 dB): likely a side-wall reflection notch (Left Surround and Right Surround).',
    )
  })

  it('names a tangential mode by its indices, and the MLP near its node', () => {
    expect(
      weaknessText({
        kind: 'dip',
        frequency: 47.6,
        deviation: -9,
        cause: {
          kind: 'mode-null',
          mode: {
            indices: { length: 1, width: 1, height: 0 },
            kind: 'tangential',
            frequency: 47.64,
          },
        },
        speakers: [],
      }),
    ).toBe(
      'Dip at 47.6 Hz (−9.0 dB): likely the MLP near a null of the tangential mode (1, 1, 0) at 47.6 Hz.',
    )
  })
})

describe('strength text', () => {
  it('names a mode the subwoofers cancel', () => {
    expect(strengthText({ kind: 'mode-cancelled', mode: LENGTH_1 })).toBe(
      'The subwoofers cancel the first length mode (43 Hz).',
    )
  })

  it('says how smooth the response is', () => {
    expect(
      strengthText({
        kind: 'smooth',
        withinTolerance: 0.82,
        from: 28.58,
        to: 502.4,
      }),
    ).toBe('Smooth: within ±3 dB over 82% of 28.6–502 Hz.')
  })
})
