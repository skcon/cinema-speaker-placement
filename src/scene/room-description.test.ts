import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  recommendSeat,
  seatHeatmap,
  type Config,
  type SeatRecommendation,
} from '@/domain'
import {
  describeFrontStageDistances,
  describeRoomView,
  type RoomViewDescriptionInput,
} from '@/scene/room-description'

/** The description input for `config`, as the room view wires it. */
function inputFor(
  config: Config,
  overrides: Partial<RoomViewDescriptionInput> = {},
): RoomViewDescriptionInput {
  const analysis = analyzeRoom(config)
  return {
    analysis,
    objectsInView: {
      room: config.room,
      roomObjects: config.roomObjects,
      seatRow: analysis.seatRow,
    },
    recommendation: null,
    heatmap: null,
    units: config.units,
    view: 'top-down',
    ...overrides,
  }
}

const IMPERIAL: Config = { ...DEFAULT_CONFIG, units: 'imperial' }

describe('room view description', () => {
  it('describes the default room top-down, in reading order', () => {
    const paragraphs = describeRoomView(inputFor(DEFAULT_CONFIG))

    expect(paragraphs).toEqual([
      'Top-down view of the room, 6 m long and 4.5 m wide, with the front ' +
        'wall at the top and the MLP 2.28 m from the front wall.',
      '5.1.2 listener-level speakers, angle from the MLP and Dolby ' +
        'placement-range grade: Left 26° (ideal), Center 0° (ideal), Right ' +
        '26° (ideal), Left Surround 115° (ideal), Right Surround 115° (ideal).',
      // Left and Right at 26°, 1.78 m ahead: 1.78 / cos 26° = 1.98 m.
      'Front speakers from the MLP: Left 1.98 m, Center 1.78 m, Right 1.98 m.',
      '2 overhead speakers on the ceiling, angle and elevation from the MLP ' +
        'and Dolby placement-range grade: Left Top Middle elevation 83° ' +
        '(ideal), Right Top Middle elevation 83° (ideal).',
      '1 subwoofer, not graded as Dolby gives subwoofers no placement range: ' +
        'Subwoofer 1 at the front wall.',
      'A seat row 2 m wide and 0.9 m deep, with the MLP 0.35 m in front of ' +
        'its back; dragging it moves the MLP. Room objects are drawn and used ' +
        'for placement warnings, not part of the estimated response.',
    ])
  })

  it('lists only Left and Right from the MLP for a layout without a Center', () => {
    const paragraphs = describeRoomView(
      inputFor({
        ...DEFAULT_CONFIG,
        layout: { dolbyLayout: '2.1', subwoofers: 1 },
      }),
    )

    expect(paragraphs).toContainEqual(
      expect.stringMatching(
        /^Front speakers from the MLP: Left [\d.]+ m, Right [\d.]+ m\.$/,
      ),
    )
  })

  it('says the room height and where it is seen from in 3D', () => {
    const [room] = describeRoomView(inputFor(DEFAULT_CONFIG, { view: '3d' }))

    expect(room).toBe(
      '3D view of the room, 6 m long, 4.5 m wide and 2.6 m high, seen from ' +
        'behind the seats, with the MLP 2.28 m from the front wall.',
    )
  })

  it('lists the overheads only for a layout that has them', () => {
    const withoutOverheads = describeRoomView(
      inputFor({
        ...DEFAULT_CONFIG,
        layout: { dolbyLayout: '5.1', subwoofers: 1 },
      }),
    )

    expect(describeRoomView(inputFor(DEFAULT_CONFIG)).join(' ')).toMatch(
      /2 overhead speakers on the ceiling/,
    )
    expect(withoutOverheads).toHaveLength(5)
    expect(withoutOverheads.join(' ')).not.toMatch(/overhead/)
  })

  it('says the MLP is at the recommended seat, and adds the heatmap last when shown', () => {
    const recommendation = recommendSeat(DEFAULT_CONFIG)
    const paragraphs = describeRoomView(
      inputFor(DEFAULT_CONFIG, {
        recommendation,
        heatmap: seatHeatmap(recommendation),
      }),
    )

    expect(paragraphs.at(-2)).toBe(
      'The MLP is at the recommended seat (an estimate).',
    )
    expect(paragraphs.at(-1)).toMatch(/^Seat-score heatmap shown/)
  })

  it('says where a recommended seat away from the MLP is ringed', () => {
    const worked = recommendSeat(DEFAULT_CONFIG)
    const recommendation: SeatRecommendation = {
      ...worked,
      mlpIsRecommended: false,
      recommended: {
        ...worked.recommended,
        position: { ...worked.recommended.position, y: 3 },
      },
    }

    const paragraphs = describeRoomView(
      inputFor(DEFAULT_CONFIG, { recommendation }),
    )

    expect(paragraphs.at(-1)).toBe(
      'The recommended seat (an estimate) is ringed, 3 m from the front wall.',
    )
  })

  it('gives the lengths in the user’s units', () => {
    const paragraphs = describeRoomView(inputFor(IMPERIAL))

    expect(paragraphs[0]).toMatch(
      /^Top-down view of the room, 19 ft 8.2 in long/,
    )
    expect(paragraphs[2]).toMatch(
      /^Front speakers from the MLP: Left 6 ft \d+(\.\d)? in, Center 5 ft \d+(\.\d)? in, Right 6 ft \d+(\.\d)? in\.$/,
    )
  })
})

describe('front-stage distances in words', () => {
  it('shows a bunched front stage as short, uneven distances', () => {
    const mlp = { x: 0, y: 3, z: 1.2 }
    const at = (x: number, y: number) => ({ x, y, z: 1.2 })

    expect(
      describeFrontStageDistances(
        {
          mlp,
          speakers: [
            { channel: 'L', name: 'Left', position: at(-0.3, 2.6) },
            { channel: 'C', name: 'Center', position: at(0, 0.5) },
            { channel: 'R', name: 'Right', position: at(0.3, 2.6) },
          ],
        },
        'metric',
      ),
    ).toBe(
      'Front speakers from the MLP: Left 0.5 m, Center 2.5 m, Right 0.5 m.',
    )
  })

  it('says nothing for a layout without front speakers', () => {
    expect(
      describeFrontStageDistances(
        { mlp: { x: 0, y: 3, z: 1.2 }, speakers: [] },
        'metric',
      ),
    ).toBe('')
  })
})
