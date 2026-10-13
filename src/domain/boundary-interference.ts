/**
 * Speaker-boundary interference: a listener-level Speaker's sound arrives
 * at the receiver directly and, a little later, reflected off the nearest
 * surfaces. Where a reflection travels half a wavelength (or 3/2, 5/2 ...)
 * further than the direct sound it cancels part of it: a notch. For the
 * wall behind a speaker d meters away, the first notch is the quarter-wave
 * one, f = c/(4d).
 *
 * A first-order image-source model (BOUNDARY_INTERFERENCE in
 * reference.ts): each reflecting surface mirrors the speaker, and the
 * image's sound is added to the direct sound with its extra delay and the
 * spreading loss of its longer path.
 */
import { add, decibels, phasor, scale, type Complex } from './complex'
import type { Aim } from './placement'
import { BOUNDARY_INTERFERENCE, SPEED_OF_SOUND } from './reference'
import type { Room, RoomPoint } from './room'

/** A surface of the Room that sound reflects off. */
export type Surface =
  'front wall' | 'back wall' | 'left wall' | 'right wall' | 'floor' | 'ceiling'

type WallSurface = Exclude<Surface, 'floor' | 'ceiling'>

/** A speaker as far as boundary interference goes: where it is and where it faces. */
export type BoundarySource = {
  readonly position: RoomPoint
  readonly aim: Aim
}

/** One surface's reflection as heard at the receiver. */
export type BoundaryReflection = {
  readonly surface: Surface
  /** How much further the reflection travels than the direct sound, in m. */
  readonly pathDifference: number
  /**
   * Its pressure relative to the direct sound: the reflection coefficient
   * times direct path / reflected path.
   */
  readonly relativeLevel: number
  /**
   * Its first notch frequencies, in Hz, lowest first: where it arrives
   * half a period (then 3/2, 5/2) late, f = (2k + 1)·c / (2·Δ).
   */
  readonly notchFrequencies: readonly number[]
}

/** How many of each reflection's notch frequencies are listed. */
const NOTCHES_LISTED = 3

/** Distance from a point to each wall, along the floor. */
function wallDistances(
  room: Room,
  { x, y }: RoomPoint,
): Record<WallSurface, number> {
  return {
    'front wall': y,
    'back wall': room.length - y,
    'left wall': x + room.width / 2,
    'right wall': room.width / 2 - x,
  }
}

/**
 * The wall straight behind a speaker: the first wall a ray from it, going
 * opposite to its aim, meets.
 */
function wallBehind(
  room: Room,
  { position, aim }: BoundarySource,
): WallSurface {
  const radians = ((aim.yaw + 180) * Math.PI) / 180
  // Yaw is clockwise from facing the front wall (−y), seen from above.
  const dx = Math.sin(radians)
  const dy = -Math.cos(radians)
  const distances = wallDistances(room, position)
  const along = (distance: number, step: number) =>
    step > 1e-12 ? distance / step : Number.POSITIVE_INFINITY
  const hits: [WallSurface, number][] = [
    ['front wall', along(distances['front wall'], -dy)],
    ['back wall', along(distances['back wall'], dy)],
    ['left wall', along(distances['left wall'], -dx)],
    ['right wall', along(distances['right wall'], dx)],
  ]
  return hits.reduce((nearest, hit) => (hit[1] < nearest[1] ? hit : nearest))[0]
}

/**
 * The surfaces whose reflections a speaker's response includes: the wall
 * behind it (from its aim), the nearest other wall (both side walls for a
 * speaker on the center line), and the nearer of the
 * floor and the ceiling (BOUNDARY_INTERFERENCE in reference.ts).
 */
export function reflectingSurfaces(
  room: Room,
  speaker: BoundarySource,
): Surface[] {
  const behind = wallBehind(room, speaker)
  const distances = wallDistances(room, speaker.position)
  const others = (Object.keys(distances) as WallSurface[]).filter(
    (wall) => wall !== behind,
  )
  const nearest = Math.min(...others.map((wall) => distances[wall]))
  // Walls equally near (a speaker on the center line) all count.
  const nearestOthers = others.filter(
    (wall) => distances[wall] - nearest < TIED,
  )
  const { z } = speaker.position
  return [behind, ...nearestOthers, z <= room.height - z ? 'floor' : 'ceiling']
}

/** Walls whose distances differ by less than this, in m, are equally near. */
const TIED = 1e-6

/** The speaker mirrored in a surface: its image source. */
function image(
  room: Room,
  { x, y, z }: RoomPoint,
  surface: Surface,
): RoomPoint {
  switch (surface) {
    case 'front wall':
      return { x, y: -y, z }
    case 'back wall':
      return { x, y: 2 * room.length - y, z }
    case 'left wall':
      return { x: -room.width - x, y, z }
    case 'right wall':
      return { x: room.width - x, y, z }
    case 'floor':
      return { x, y, z: -z }
    case 'ceiling':
      return { x, y, z: 2 * room.height - z }
  }
}

function distance(a: RoomPoint, b: RoomPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** The reflections of `speaker`'s reflecting surfaces, heard at `receiver`. */
export function boundaryReflections(
  room: Room,
  speaker: BoundarySource,
  receiver: RoomPoint,
): BoundaryReflection[] {
  const c = SPEED_OF_SOUND.metersPerSecond
  const direct = distance(speaker.position, receiver)
  return reflectingSurfaces(room, speaker).map((surface) => {
    const reflected = distance(image(room, speaker.position, surface), receiver)
    const pathDifference = reflected - direct
    return {
      surface,
      pathDifference,
      relativeLevel:
        (BOUNDARY_INTERFERENCE.reflectionCoefficient * direct) / reflected,
      notchFrequencies: Array.from(
        { length: NOTCHES_LISTED },
        (_, k) => ((2 * k + 1) * c) / (2 * pathDifference),
      ),
    }
  })
}

/**
 * The speaker's pressure at the receiver relative to its direct sound, per
 * frequency: 1 + Σ a·e^(−j·2π·f·Δ/c) over the reflections. The speaker
 * itself is omnidirectional (BOUNDARY_INTERFERENCE in reference.ts).
 */
export function boundaryInterference(
  reflections: readonly BoundaryReflection[],
  frequencies: readonly number[],
): Complex[] {
  const c = SPEED_OF_SOUND.metersPerSecond
  return frequencies.map((f) =>
    reflections.reduce<Complex>(
      (sum, { pathDifference, relativeLevel }) =>
        add(
          sum,
          scale(relativeLevel, phasor((-2 * Math.PI * f * pathDifference) / c)),
        ),
      { re: 1, im: 0 },
    ),
  )
}

/** The speaker's boundary interference as a level in dB at each frequency. */
export function interferenceLevels(
  reflections: readonly BoundaryReflection[],
  frequencies: readonly number[],
): number[] {
  return boundaryInterference(reflections, frequencies).map(decibels)
}
