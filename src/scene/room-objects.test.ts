import { describe, expect, it } from 'vitest'
import type { RoomScreen } from '@/domain'
import {
  describeScreen,
  describeSeatRow,
  SCREEN_BAR_DEPTH,
  screenBar,
  screenPanel,
} from '@/scene/room-objects'

const TV: RoomScreen = {
  kind: 'tv',
  width: 1.44,
  height: 0.81,
  bottomEdge: 0.93,
  x: 0,
  standoff: null,
}

const AT_SCREEN: RoomScreen = {
  kind: 'projection',
  width: 2.66,
  height: 1.5,
  bottomEdge: 0.6,
  x: -0.5,
  standoff: 0.75,
}

describe('the screen from above', () => {
  it('is a bar its width wide, against the inside of the front wall', () => {
    expect(screenBar(TV)).toEqual({
      center: { x: 0, y: SCREEN_BAR_DEPTH / 2, z: 0 },
      width: 1.44,
      depth: SCREEN_BAR_DEPTH,
    })
  })

  it('stands an acoustically transparent screen off the wall', () => {
    expect(screenBar(AT_SCREEN).center).toEqual({
      x: -0.5,
      y: 0.75 + SCREEN_BAR_DEPTH / 2,
      z: 0,
    })
  })
})

describe('the screen in 3D', () => {
  it('is a panel facing into the room, from its bottom edge up', () => {
    const panel = screenPanel(TV)

    // Three.js has y up: room (x, y, z) -> (x, z, y).
    expect(panel.position[0]).toBe(0)
    expect(panel.position[1]).toBeCloseTo(0.93 + 0.81 / 2, 9)
    expect(panel.position[2]).toBeGreaterThan(0)
    expect(panel.position[2]).toBeLessThan(0.05)
    expect(panel.size).toEqual([1.44, 0.81])
  })

  it('stands an acoustically transparent screen off the wall', () => {
    expect(screenPanel(AT_SCREEN).position[2]).toBeCloseTo(0.75, 1)
  })
})

describe('the screen in words', () => {
  it('names a TV, its size, its height and that it is centred', () => {
    expect(describeScreen(TV, 'metric')).toBe(
      'A TV on the front wall, 1.44 m wide and 0.81 m high, its bottom edge 0.93 m above the floor, centred.',
    )
  })

  it('says how far an off-centre, acoustically transparent screen is moved and stands off', () => {
    expect(describeScreen(AT_SCREEN, 'metric')).toBe(
      'An acoustically transparent projection screen 0.75 m in front of the front wall, 2.66 m wide and 1.5 m high, its bottom edge 0.6 m above the floor, its middle 0.5 m left of centre.',
    )
  })

  it('writes the lengths in the chosen units', () => {
    expect(describeScreen({ ...TV, x: 0.3048 }, 'imperial')).toBe(
      'A TV on the front wall, 4 ft 8.7 in wide and 2 ft 7.9 in high, its bottom edge 3 ft 0.6 in above the floor, its middle 1 ft 0 in right of centre.',
    )
  })
})

describe('the seat row in words', () => {
  it('gives its size and where the MLP sits on it', () => {
    expect(describeSeatRow({ width: 2, depth: 0.9 }, 'metric')).toBe(
      'A seat row 2 m wide and 0.9 m deep, with the MLP 0.35 m in front of its back; dragging it moves the MLP.',
    )
  })

  it('writes the lengths in the chosen units', () => {
    expect(describeSeatRow({ width: 3.6576, depth: 0.9144 }, 'imperial')).toBe(
      'A seat row 12 ft 0 in wide and 3 ft 0 in deep, with the MLP 1 ft 1.8 in in front of its back; dragging it moves the MLP.',
    )
  })
})
