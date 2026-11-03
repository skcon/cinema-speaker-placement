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
 *
 * An overhead speaker (on the ceiling) takes the same model from its own
 * nearest boundaries, used only by its Channel response
 * (`overheadReflectingSurfaces`).
 */
import { add, decibels, phasor, scale, type Complex } from './complex'
import type { Aim } from './placement'
import { BOUNDARY_INTERFERENCE, SPEED_OF_SOUND } from './reference'
import { distanceBetween, type Room, type RoomPoint, type Wall } from './room'
import { distanceToWall } from './wall-frame'

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

/** The wall of each wall Surface, in the order tied walls are listed. */
const WALL_OF: Record<WallSurface, Wall> = {
  'front wall': 'front',
  'back wall': 'back',
  'left wall': 'left',
  'right wall': 'right',
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
  // `+ 0` turns the −0 the wall frame gives on the back or right wall into 0.
  const along = (wall: WallSurface, step: number) =>
    step > 1e-12
      ? (distanceToWall(room, position, WALL_OF[wall]) + 0) / step
      : Number.POSITIVE_INFINITY
  const hits: [WallSurface, number][] = [
    ['front wall', along('front wall', -dy)],
    ['back wall', along('back wall', dy)],
    ['left wall', along('left wall', -dx)],
    ['right wall', along('right wall', dx)],
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
  const others = (Object.keys(WALL_OF) as WallSurface[]).filter(
    (wall) => wall !== behind,
  )
  // `+ 0` turns the −0 the wall frame gives on the back or right wall into 0.
  const distance = (wall: WallSurface) =>
    distanceToWall(room, speaker.position, WALL_OF[wall]) + 0
  const nearest = Math.min(...others.map(distance))
  // Walls equally near (a speaker on the center line) all count.
  const nearestOthers = others.filter((wall) => distance(wall) - nearest < TIED)
  const { z } = speaker.position
  return [behind, ...nearestOthers, z <= room.height - z ? 'floor' : 'ceiling']
}

/** Walls whose distances differ by less than this, in m, are equally near. */
const TIED = 1e-6

/**
 * The surfaces whose reflections an overhead speaker's response includes:
 * its three nearest boundaries, as for a listener-level speaker
 * (BOUNDARY_INTERFERENCE in reference.ts), which on the ceiling are the
 * ceiling, the nearer end wall (front or back) and the nearer side wall
 * (both of a pair it is equally near). Only the walls are listed:
 *
 * - The ceiling it is mounted on mirrors it onto itself (no path
 *   difference), and mirrors each wall's image onto that image too: it
 *   doubles the direct sound and every reflection alike, a level the same
 *   at every frequency that calibration removes, with no notch.
 * - The floor is the farthest boundary from it, not one of the nearest.
 */
export function overheadReflectingSurfaces(
  room: Room,
  position: RoomPoint,
): Surface[] {
  const nearestOf = (pair: readonly WallSurface[]) => {
    // `+ 0` turns the −0 the wall frame gives on the back or right wall into 0.
    const distance = (wall: WallSurface) =>
      distanceToWall(room, position, WALL_OF[wall]) + 0
    const nearest = Math.min(...pair.map(distance))
    return pair.filter((wall) => distance(wall) - nearest < TIED)
  }
  return [
    ...nearestOf(['front wall', 'back wall']),
    ...nearestOf(['left wall', 'right wall']),
  ]
}

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

/** The reflections of `speaker`'s reflecting surfaces, heard at `receiver`. */
export function boundaryReflections(
  room: Room,
  speaker: BoundarySource,
  receiver: RoomPoint,
): BoundaryReflection[] {
  return reflectionsOff(
    room,
    speaker.position,
    reflectingSurfaces(room, speaker),
    receiver,
  )
}

/**
 * The reflections of an overhead speaker at `position` off its reflecting
 * surfaces (`overheadReflectingSurfaces`), heard at `receiver`.
 */
export function overheadReflections(
  room: Room,
  position: RoomPoint,
  receiver: RoomPoint,
): BoundaryReflection[] {
  return reflectionsOff(
    room,
    position,
    overheadReflectingSurfaces(room, position),
    receiver,
  )
}

/** The reflections of a speaker at `position` off `surfaces`, heard at `receiver`. */
function reflectionsOff(
  room: Room,
  position: RoomPoint,
  surfaces: readonly Surface[],
  receiver: RoomPoint,
): BoundaryReflection[] {
  const c = SPEED_OF_SOUND.metersPerSecond
  const direct = distanceBetween(position, receiver)
  return surfaces.map((surface) => {
    const reflected = distanceBetween(image(room, position, surface), receiver)
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

/**
 * The speaker's boundary interference as a power ratio at each frequency:
 * |1 + Σ a·e^(−j·2π·f·Δ/c)|², as boundaryInterference, without its
 * complex values (front-wall-distance.ts works it out for many distances).
 */
export function interferencePowers(
  reflections: readonly BoundaryReflection[],
  frequencies: readonly number[],
): number[] {
  const c = SPEED_OF_SOUND.metersPerSecond
  return frequencies.map((f) => {
    let re = 1
    let im = 0
    for (const { pathDifference, relativeLevel } of reflections) {
      const radians = (-2 * Math.PI * f * pathDifference) / c
      re += relativeLevel * Math.cos(radians)
      im += relativeLevel * Math.sin(radians)
    }
    return re * re + im * im
  })
}

/** The speaker's boundary interference as a level in dB at each frequency. */
export function interferenceLevels(
  reflections: readonly BoundaryReflection[],
  frequencies: readonly number[],
): number[] {
  return boundaryInterference(reflections, frequencies).map(decibels)
}
