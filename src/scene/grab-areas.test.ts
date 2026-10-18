import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  defaultScreen,
  dragAnchors,
  MLP_ID,
  SCREEN_ID,
  SEAT_ROW_ID,
  withDragged,
  type Config,
  type DragTarget,
  type FloorPoint,
} from '@/domain'
import { grabAreas, pressAt } from '@/scene/grab-areas'
import { screenBar } from '@/scene/room-objects'
import {
  OVERHEAD_MARKER_RADIUS,
  SPEAKER_FOOTPRINT,
  speakerFacing,
  SUBWOOFER_FOOTPRINT,
} from '@/scene/speakers'

/** What a press at `point` picks up in `config`'s room at `zoom` px/m. */
function pressed(
  config: Config,
  point: FloorPoint,
  zoom: number,
): DragTarget | null {
  const areas = grabAreas(config, analyzeRoom(config))
  return pressAt(areas, point, zoom)?.target ?? null
}

/** Where `target`'s anchor is in `config`. */
function anchorOf(config: Config, target: DragTarget): FloorPoint {
  const anchor = dragAnchors(config, analyzeRoom(config)).get(target)
  if (!anchor) throw new Error(`${target} has no anchor`)
  return anchor
}

/** The default room (5.1.2, one subwoofer) with the default TV. */
const WITH_SCREEN: Config = {
  ...DEFAULT_CONFIG,
  roomObjects: {
    ...DEFAULT_CONFIG.roomObjects,
    screen: defaultScreen(DEFAULT_CONFIG.room),
  },
}

describe('grab areas', () => {
  it('give every drag target one, anchored where a drag of it moves', () => {
    const analysis = analyzeRoom(WITH_SCREEN)
    const areas = grabAreas(WITH_SCREEN, analysis)
    const anchors = dragAnchors(WITH_SCREEN, analysis)

    expect(
      new Map(areas.map(({ target, anchor }) => [target, anchor])),
    ).toEqual(anchors)
    expect(areas).toHaveLength(anchors.size)
  })

  it('pick a press on a target up by its anchor', () => {
    const areas = grabAreas(WITH_SCREEN, analyzeRoom(WITH_SCREEN))
    const ls = anchorOf(WITH_SCREEN, 'Ls')

    expect(pressAt(areas, { x: ls.x + 0.05, y: ls.y }, 100)).toMatchObject({
      target: 'Ls',
      anchor: ls,
    })
  })

  it('pick nothing up where nothing is pressed', () => {
    expect(pressed(DEFAULT_CONFIG, { x: 0, y: 4.5 }, 100)).toBeNull()
  })
})

describe('a press on the couch and an overhead (#91)', () => {
  // The default room at 56 px per meter, a phone-sized view: the
  // overheads' touch targets reach well past their markers, onto the couch.
  const zoom = 56
  const mlp = anchorOf(DEFAULT_CONFIG, MLP_ID)
  const rtm = anchorOf(DEFAULT_CONFIG, 'Rtm')

  it('picks the couch for a press on it beside the MLP, inside an overhead touch target but off its marker', () => {
    // 0.1 m left of the overhead marker's edge: on the couch, which ends
    // 1 m right of the center line, and 0.27 m from the overhead's center,
    // inside its 0.39 m touch target.
    const onCouch = { x: rtm.x - OVERHEAD_MARKER_RADIUS - 0.1, y: rtm.y }
    expect(pressed(DEFAULT_CONFIG, onCouch, zoom)).toBe(SEAT_ROW_ID)
    // Nearer the MLP, where the MLP's and the overhead's touch targets
    // both reach, but off both markers.
    expect(pressed(DEFAULT_CONFIG, { x: mlp.x + 0.45, y: rtm.y }, zoom)).toBe(
      SEAT_ROW_ID,
    )
  })

  it('picks the overhead for a press on its marker, even where it is over the couch', () => {
    expect(pressed(DEFAULT_CONFIG, rtm, zoom)).toBe('Rtm')

    // Dragged in over the couch's end.
    const over = withDragged(DEFAULT_CONFIG, 'Rtm', { x: 0.9, y: rtm.y })
    expect(pressed(over, { x: 0.9, y: rtm.y }, zoom)).toBe('Rtm')
  })

  it('picks the MLP for a press on its marker on the couch', () => {
    expect(pressed(DEFAULT_CONFIG, { x: mlp.x + 0.1, y: mlp.y }, zoom)).toBe(
      MLP_ID,
    )
  })
})

describe('touch targets', () => {
  const rtm = anchorOf(DEFAULT_CONFIG, 'Rtm')
  // Beside the couch, 0.1 m right of the overhead marker's edge.
  const beside = { x: rtm.x + OVERHEAD_MARKER_RADIUS + 0.1, y: rtm.y }

  it('reach a press off a marker at least half a 44 px touch target from its center', () => {
    // At 56 px per meter a touch target is 0.79 m across.
    expect(pressed(DEFAULT_CONFIG, beside, 56)).toBe('Rtm')
    // Zoomed in to 400 px per meter, it is smaller than the marker.
    expect(pressed(DEFAULT_CONFIG, beside, 400)).toBeNull()
  })

  it('make the thin screen bar at least a 44 px touch target deep', () => {
    // Clear of the Center and Subwoofer 1, 0.2 m in front of the bar.
    const config = withDragged(WITH_SCREEN, 'C', { x: 1.5, y: 4.5 })
    const point = { x: -0.45, y: 0.2 }
    // At 50 px per meter, 0.88 m deep around the bar's middle.
    expect(pressed(config, point, 50)).toBe(SCREEN_ID)
    expect(pressed(config, point, 400)).toBeNull()
  })

  it('reach a speaker cabinet drawn past its touch target', () => {
    // Left's corner, zoomed in so far the touch target is the marker's
    // 0.16 m radius: the cabinet's corner is further out, but drawn.
    const left = analyzeRoom(DEFAULT_CONFIG).speakers.find(
      ({ channel }) => channel === 'L',
    )!
    // Its cabinet is turned to face the MLP: a point just inside a corner.
    const facing = speakerFacing(left.aim)
    const across = { x: facing.y, y: -facing.x }
    const half = {
      width: (0.98 * SPEAKER_FOOTPRINT.width) / 2,
      depth: (0.98 * SPEAKER_FOOTPRINT.depth) / 2,
    }
    const corner = {
      x: left.position.x + half.width * across.x + half.depth * facing.x,
      y: left.position.y + half.width * across.y + half.depth * facing.y,
    }
    expect(
      Math.hypot(corner.x - left.position.x, corner.y - left.position.y),
    ).toBeGreaterThan(SPEAKER_FOOTPRINT.width / 2)
    expect(pressed(DEFAULT_CONFIG, corner, 400)).toBe('L')
  })
})

describe('markers drawn over each other', () => {
  it('picks a speaker for a press on it over the screen', () => {
    // A projection screen 0.3 m off the front wall, Left in front of it.
    const config: Config = {
      ...WITH_SCREEN,
      roomObjects: {
        ...WITH_SCREEN.roomObjects,
        screen: { ...defaultScreen(WITH_SCREEN.room), standoff: 0.3 },
      },
    }
    const bar = screenBar(config.roomObjects.screen!)
    const moved = withDragged(config, 'L', { x: -0.5, y: bar.center.y })
    const left = anchorOf(moved, 'L')
    expect(left.y).toBeCloseTo(bar.center.y, 9)

    // On Left's marker and on the screen's bar.
    expect(pressed(moved, left, 100)).toBe('L')
    // On the bar away from it, the screen.
    expect(pressed(moved, { x: 0.45, y: bar.center.y }, 100)).toBe(SCREEN_ID)
  })

  it('picks the Center for a press on its cabinet over Subwoofer 1, and the subwoofer where it shows around it', () => {
    const center = anchorOf(DEFAULT_CONFIG, 'C')
    const sub = anchorOf(DEFAULT_CONFIG, 'Sub1')
    // The Center's cabinet is 0.22 m deep toward the MLP, the subwoofer's
    // square 0.44 m: both are under a press at the cabinet's middle.
    expect(Math.abs(center.y - sub.y)).toBeLessThan(SUBWOOFER_FOOTPRINT / 2)
    expect(pressed(DEFAULT_CONFIG, center, 200)).toBe('C')

    // Inside the Center's round marker but off its cabinet, where the
    // subwoofer's square shows: the subwoofer, as drawn.
    const offCabinet = {
      x: center.x,
      y: center.y - SPEAKER_FOOTPRINT.depth / 2 - 0.02,
    }
    expect(pressed(DEFAULT_CONFIG, offCabinet, 200)).toBe('Sub1')
  })

  it('picks the room object drawn first where two are equally near, as a fresh page draws them', () => {
    // The default TV over the default cabinet at the middle of the front
    // wall: the cabinet is drawn (and was registered for presses) first.
    const config: Config = {
      ...WITH_SCREEN,
      roomObjects: {
        ...WITH_SCREEN.roomObjects,
        furniture: [
          {
            name: 'Cabinet',
            width: 1.6,
            depth: 0.45,
            height: 0.5,
            x: 0,
            y: 0.225,
            rotation: 0,
          },
        ],
      },
    }
    expect(pressed(config, { x: 0.4, y: 0.04 }, 100)).toBe('furniture-1')
  })
})
