import { Euler, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  type Config,
  type PlacedSpeaker,
  type PlacementGrade,
} from '@/domain'
import {
  describeOverhead,
  describeSpeaker,
  describeSubwoofer,
  GRADE_STYLES,
  itemsInDrawOrder,
  overheadAngles,
  overheadMarker,
  speakerMarker,
  subwooferMarker,
  UNGRADED_STYLE,
} from '@/scene/speakers'

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

describe('subwoofer markers in the top-down scene', () => {
  const fourSubwoofers = analyzeRoom({
    ...DEFAULT_CONFIG,
    layout: { dolbyLayout: '5.1.2', subwoofers: 4 },
  }).subwoofers

  it('sit at the subwoofer position, mapped to Three.js', () => {
    const [front] = fourSubwoofers
    if (!front) throw new Error('no subwoofer')

    expect(subwooferMarker(front).position).toEqual([
      front.position.x,
      front.position.z,
      front.position.y,
    ])
  })

  it('are drawn in a neutral color and labelled ungraded, as Dolby gives them no placement range', () => {
    expect(
      fourSubwoofers.map(subwooferMarker).map(({ label, color }) => ({
        label,
        color,
      })),
    ).toEqual([
      { label: 'Sub1', color: '#64748b' },
      { label: 'Sub2', color: '#64748b' },
      { label: 'Sub3', color: '#64748b' },
      { label: 'Sub4', color: '#64748b' },
    ])
    expect(UNGRADED_STYLE.label).toBe('ungraded')
  })

  it('put the label beside the marker along its wall, clear of the speakers', () => {
    // Front and back wall: to the right, so the Center's label (below it)
    // stays clear. Side walls: below.
    expect(
      fourSubwoofers.map((sub) => subwooferMarker(sub).labelDirection),
    ).toEqual([
      { x: 1, y: 0 }, // front
      { x: 0, y: 1 }, // left
      { x: 0, y: 1 }, // right
      { x: 1, y: 0 }, // back
    ])
  })

  it('describe the subwoofer and its wall in words', () => {
    expect(fourSubwoofers.map(describeSubwoofer)).toEqual([
      'Subwoofer 1 at the front wall',
      'Subwoofer 2 at the left wall',
      'Subwoofer 3 at the right wall',
      'Subwoofer 4 at the back wall',
    ])
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

describe('the order the items are drawn in', () => {
  it('is the MLP, the subwoofers, the listener-level speakers, then the overheads', () => {
    const { items } = analyzeRoom({
      ...DEFAULT_CONFIG,
      layout: { dolbyLayout: '5.1.2', subwoofers: 2 },
    })

    expect(itemsInDrawOrder(items).map(({ id }) => id)).toEqual([
      'MLP',
      'Sub1',
      'Sub2',
      'L',
      'C',
      'R',
      'Ls',
      'Rs',
      'Ltm',
      'Rtm',
    ])
  })
})

describe('overhead speakers in the top-down scene', () => {
  const fourOverheads = analyzeRoom({
    ...DEFAULT_CONFIG,
    layout: { dolbyLayout: '5.1.4', subwoofers: 1 },
  } satisfies Config).overheads
  const twoOverheads = analyzeRoom(DEFAULT_CONFIG).overheads

  it('are drawn at their place on the ceiling, colored by grade, labelled by channel and elevation', () => {
    const [ltf] = fourOverheads
    if (!ltf) throw new Error('no Ltf')

    expect(overheadMarker(ltf)).toMatchObject({
      // Room (x, y, z) -> Three.js (x, z, y), on the 2.6 m ceiling.
      position: [ltf.position.x, 2.6, ltf.position.y],
      color: GRADE_STYLES.ideal.color,
      label: 'Ltf 45°',
      grade: 'ideal',
      labelDirection: { x: -1, y: 0 },
    })
    expect(overheadMarker(fourOverheads[3]!)).toMatchObject({
      label: 'Rtr 135°',
      labelDirection: { x: 1, y: 0 },
    })
  })

  it('take the color of their overall grade', () => {
    const [ltf] = fourOverheads
    if (!ltf) throw new Error('no Ltf')

    expect(
      overheadMarker({
        ...ltf,
        placementRange: { ...ltf.placementRange, grade: 'outside' },
      }).color,
    ).toBe(GRADE_STYLES.outside.color)
  })

  it('show the angle from the MLP where Dolby grades it, and the elevation', () => {
    // 5.1.4 in the default room: top front at 40°, 45° up (side view).
    expect(overheadAngles(fourOverheads[0]!)).toBe('40° · elev. 45°')
    // Top middle has no Dolby azimuth range, so only its elevation is shown.
    expect(overheadAngles(twoOverheads[0]!)).toBe('elev. 83°')
  })

  it('are described in words with their angles and grade', () => {
    expect(describeOverhead(fourOverheads[2]!)).toBe(
      'Left Top Rear 140°, elevation 135° (ideal)',
    )
    expect(describeOverhead(twoOverheads[1]!)).toBe(
      'Right Top Middle elevation 83° (ideal)',
    )
  })
})
