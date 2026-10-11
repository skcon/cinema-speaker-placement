import { Euler, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type PlacedSpeaker,
  type PlacementGrade,
} from '@/domain'
import { describeSpeaker, GRADE_STYLES, speakerMarker } from '@/scene/speakers'

const analysis = analyzeRoom(DEFAULT_CONFIG)
const MLP = analysis.mlp

function placed(channel: string): PlacedSpeaker {
  const found = analysis.speakers.find((s) => s.channel === channel)
  if (!found) throw new Error(`no ${channel} speaker`)
  return found
}

/** The same speaker, graded differently. */
function graded(speaker: PlacedSpeaker, grade: PlacementGrade): PlacedSpeaker {
  return { ...speaker, placementRange: { ...speaker.placementRange, grade } }
}

describe('speaker markers in the top-down scene', () => {
  it('sit at the speaker position, mapped to Three.js', () => {
    const { position } = placed('C')

    expect(speakerMarker(placed('C')).position).toEqual([
      position.x,
      position.z,
      position.y,
    ])
  })

  it('turn the front of the cabinet toward the MLP', () => {
    for (const speaker of analysis.speakers) {
      const { rotation } = speakerMarker(speaker)
      // The cabinet's front is the shape's +y side before it is laid flat.
      const front = new Vector3(0, 1, 0).applyEuler(new Euler(...rotation))
      const towardMlp = new Vector3(
        MLP.x - speaker.position.x,
        0,
        MLP.y - speaker.position.y,
      ).normalize()

      expect(front.x).toBeCloseTo(towardMlp.x, 9)
      expect(front.y).toBeCloseTo(0, 9)
      expect(front.z).toBeCloseTo(towardMlp.z, 9)
    }
  })

  it('are colored by placement-range grade: green ideal, amber acceptable, red outside', () => {
    const left = placed('L')

    expect(speakerMarker(graded(left, 'ideal')).color).toBe('#16a34a')
    expect(speakerMarker(graded(left, 'acceptable')).color).toBe('#d97706')
    expect(speakerMarker(graded(left, 'outside')).color).toBe('#dc2626')
  })

  it('label the channel and its angle from the MLP, and the grade in words', () => {
    expect(speakerMarker(placed('L'))).toMatchObject({
      label: 'L 26°',
      grade: 'ideal',
    })
    expect(speakerMarker(placed('Rs')).label).toBe('Rs 115°')
    expect(Object.values(GRADE_STYLES).map(({ label }) => label)).toEqual([
      'ideal',
      'acceptable',
      'outside',
    ])
  })

  it('put the label beside the marker on the MLP side, straight across or straight up or down the screen', () => {
    const sevenOne = analyzeRoom({
      ...DEFAULT_CONFIG,
      layout: { dolbyLayout: '7.1', subwoofers: 1 },
    })
    const labelDirection = (channel: string) => {
      const speaker = sevenOne.speakers.find((s) => s.channel === channel)
      if (!speaker) throw new Error(`no ${channel} speaker`)
      return speakerMarker(speaker).labelDirection
    }

    // Screen x to the right, y down; the front wall is at the top.
    expect(labelDirection('C')).toEqual({ x: 0, y: 1 }) // in front: below
    expect(labelDirection('L')).toEqual({ x: 0, y: 1 }) // front left, 26°: below
    expect(labelDirection('Ls')).toEqual({ x: 1, y: 0 }) // left side, 100°: right of it
    expect(labelDirection('Rs')).toEqual({ x: -1, y: 0 }) // right side: left of it
    expect(labelDirection('Lrs')).toEqual({ x: 0, y: -1 }) // behind, 143°: above
  })
})

describe('speakers in words', () => {
  it('names the channel, its angle from the MLP and its grade', () => {
    expect(describeSpeaker(placed('Ls'))).toBe('Left Surround 115° (ideal)')
    expect(describeSpeaker(graded(placed('R'), 'acceptable'))).toBe(
      'Right 26° (acceptable)',
    )
  })
})
