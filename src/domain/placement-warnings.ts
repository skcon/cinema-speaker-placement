/**
 * Placement warnings (GLOSSARY.md, ADR 0006): hints that a speaker, a
 * subwoofer or the MLP sits somewhere a room object makes worse. Never a
 * block, and never part of the estimated response. Each warning names the
 * items it is about, says what is wrong in words, and names where its rule
 * comes from: a standard, a manufacturer, community practice or our own
 * assumption (PLACEMENT_WARNINGS in reference.ts, from section 6 of
 * docs/research/room-openings-and-furniture.md).
 *
 * Each rule is a function from the placed room (WarningInput) to its
 * warnings. Adding a rule means adding its reference data, a function
 * below and a line in RULES.
 */
import { segmentHitsBox, type AxisBox } from './box-geometry'
import type { ChannelId, OverheadChannelId } from './dolby-layouts'
import { furnitureLabel, furnitureSolid, type FurnitureBox } from './furniture'
import { MLP_ID, type PlaceableId } from './manual-positions'
import {
  floorDistanceToOpening,
  isInFrontOfOpening,
  isInOpening,
  openingLabel,
  wallReflectionPoint,
  type Opening,
} from './openings'
import {
  PLACEMENT_WARNINGS,
  type Citation,
  type SourceClass,
} from './reference'
import {
  roomObjectId,
  type RoomObjectId,
  type RoomObjects,
} from './room-objects'
import type { Room, RoomPoint, Wall } from './room'
import type { SubwooferId } from './subwoofer-arrangements'

/** A placement warning's id: its number in the research note's section 6. */
export type PlacementWarningId = keyof typeof PLACEMENT_WARNINGS

/** Something a warning is about: a speaker, subwoofer, the MLP or a room object. */
export type WarnedItem = PlaceableId | RoomObjectId

/** A placement warning (see above). */
export type PlacementWarning = {
  readonly id: PlacementWarningId
  /** What it is about, the speaker or MLP first. */
  readonly items: readonly WarnedItem[]
  /** What is wrong, in words without lengths (so in any units). */
  readonly message: string
  /** Where the rule comes from. */
  readonly sourceClass: SourceClass
  /** What the rule rests on and what is ours, in words. */
  readonly note: string
  readonly citations: readonly Citation[]
}

/** Where everything is that the rules look at, in room coordinates (meters). */
export type WarningInput = {
  readonly room: Room
  readonly roomObjects: RoomObjects
  /** The MLP: the listener's ears. */
  readonly mlp: RoomPoint
  /** Listener-level speakers: acoustic centre and woofer. */
  readonly speakers: readonly {
    readonly channel: ChannelId
    readonly name: string
    readonly position: RoomPoint
    readonly woofer: RoomPoint
  }[]
  readonly overheads: readonly {
    readonly channel: OverheadChannelId
    readonly name: string
    readonly position: RoomPoint
  }[]
  readonly subwoofers: readonly {
    readonly id: SubwooferId
    readonly name: string
    readonly position: RoomPoint
  }[]
}

type WarningRule = (input: WarningInput) => PlacementWarning[]

/** A warning of rule `id`, with its source from PLACEMENT_WARNINGS. */
function warning(
  id: PlacementWarningId,
  items: readonly WarnedItem[],
  message: string,
): PlacementWarning {
  const { sourceClass, note, citations } = PLACEMENT_WARNINGS[id]
  return { id, items, message, sourceClass, note, citations }
}

/** Each opening of the Room with its id and label, of one kind or all. */
function openingsOf(
  { openings }: RoomObjects,
  kind?: Opening['kind'],
): { opening: Opening; id: WarnedItem; label: string }[] {
  return openings.flatMap((opening, index) =>
    kind === undefined || opening.kind === kind
      ? [
          {
            opening,
            id: roomObjectId('opening', index),
            label: openingLabel(opening, index),
          },
        ]
      : [],
  )
}

/**
 * W1: a listener-level speaker or a subwoofer stands where a door swings:
 * between its edges, no further into the room than the door is wide (its
 * leaf's reach, opening into the room; ours).
 */
const speakerBlocksDoor: WarningRule = ({
  room,
  roomObjects,
  speakers,
  subwoofers,
}) =>
  [
    ...speakers.map(({ channel, name, position }) => ({
      item: channel,
      name,
      position,
    })),
    ...subwoofers.map(({ id, name, position }) => ({
      item: id,
      name,
      position,
    })),
  ].flatMap(({ item, name, position }) =>
    openingsOf(roomObjects, 'door').flatMap(({ opening, id, label }) =>
      isInFrontOfOpening(room, opening, position, opening.width)
        ? [
            warning(
              'W1',
              [item, id],
              `${name} is in front of ${label}, where the door swings.`,
            ),
          ]
        : [],
    ),
  )

/**
 * W2: a listener-level speaker in front of a window: between its edges,
 * at most PLACEMENT_WARNINGS.W2.meters from its wall, with its tweeter
 * (acoustic centre) or woofer between the sill and the top.
 */
const speakerInFrontOfWindow: WarningRule = ({ room, roomObjects, speakers }) =>
  speakers.flatMap(({ channel, name, position, woofer }) =>
    openingsOf(roomObjects).flatMap(({ opening, id, label }) => {
      if (opening.kind !== 'window') return []
      const { sill, height } = opening
      const atHeight = [position.z, woofer.z].some(
        (z) => z >= sill && z <= sill + height,
      )
      return atHeight &&
        isInFrontOfOpening(
          room,
          opening,
          position,
          PLACEMENT_WARNINGS.W2.meters,
        )
        ? [
            warning(
              'W2',
              [channel, id],
              `${name} is in front of ${label}: the glass reflects mids and treble and lets bass through, unlike the wall beside it.`,
            ),
          ]
        : []
    }),
  )

/**
 * W3: a subwoofer at most PLACEMENT_WARNINGS.W3.meters from a door, on
 * the floor plan.
 */
const subwooferNearDoorway: WarningRule = ({ room, roomObjects, subwoofers }) =>
  subwoofers.flatMap(({ id: subwoofer, name, position }) =>
    openingsOf(roomObjects, 'door').flatMap(({ opening, id, label }) =>
      floorDistanceToOpening(room, opening, position) <=
      PLACEMENT_WARNINGS.W3.meters
        ? [
            warning(
              'W3',
              [subwoofer, id],
              `${name} is in or near ${label}: bass may leak into the next room, and the estimated response assumes a closed wall there.`,
            ),
          ]
        : [],
    ),
  )

/** The listener-level channels that mirror each other, left first. */
const MIRRORED_CHANNELS = [
  ['L', 'R'],
  ['Ls', 'Rs'],
  ['Lrs', 'Rrs'],
] as const satisfies readonly (readonly [ChannelId, ChannelId])[]

/** Each side wall and the one that mirrors it. */
const MIRRORED_WALLS = [
  ['left', 'right'],
  ['right', 'left'],
] as const satisfies readonly (readonly [Wall, Wall])[]

/**
 * W5: of a left/right pair, one speaker's first reflection off a side
 * wall (on its way to the MLP's ears) falls on an opening, and the mirror
 * speaker's off the mirror wall falls on none. Both reflections off each
 * side wall are checked: a speaker's own side and the far side.
 */
const reflectionsDiffer: WarningRule = ({ room, roomObjects, mlp, speakers }) =>
  MIRRORED_CHANNELS.flatMap((pair) => {
    const [left, right] = pair.map((channel) =>
      speakers.find((speaker) => speaker.channel === channel),
    )
    if (!left || !right) return []
    return MIRRORED_WALLS.flatMap(([wall, mirrorWall]) => {
      const sides = [
        { speaker: left, wall },
        { speaker: right, wall: mirrorWall },
      ].map(({ speaker, wall: side }) => {
        const point = wallReflectionPoint(room, side, speaker.position, mlp)
        return {
          speaker,
          wall: side,
          at:
            point &&
            openingsOf(roomObjects).find(({ opening }) =>
              isInOpening(room, opening, side, point),
            ),
        }
      })
      const [hit, plain] = sides[0]?.at ? sides : [...sides].reverse()
      if (!hit?.at || !plain || plain.at) return []
      return [
        warning(
          'W5',
          [hit.speaker.channel, plain.speaker.channel, hit.at.id],
          `Left and right reflect differently: ${hit.at.label} is at ${hit.speaker.name}'s reflection point on the ${hit.wall} wall, but ${plain.speaker.name}'s on the ${plain.wall} wall is plain wall.`,
        ),
      ]
    })
  })

/** A furniture box as a solid from the floor to its top. */
function solid(box: FurnitureBox): AxisBox {
  const { left, right, front, back, top } = furnitureSolid(box)
  return {
    min: { x: left, y: front, z: 0 },
    max: { x: right, y: back, z: top },
  }
}

/** A furniture box's rectangle on the floor plan, at every height. */
function column(box: FurnitureBox): AxisBox {
  const { min, max } = solid(box)
  return {
    min: { ...min, z: -Infinity },
    max: { ...max, z: Infinity },
  }
}

/**
 * W4: a furniture box blocks the direct sound of a listener-level or
 * overhead speaker, the straight line from its acoustic centre to the
 * MLP's ears (a speaker inside a box counts). Subwoofers are exempt.
 */
const furnitureBlocksDirectSound: WarningRule = ({
  roomObjects,
  mlp,
  speakers,
  overheads,
}) =>
  [...speakers, ...overheads].flatMap(({ channel, name, position }) =>
    roomObjects.furniture.flatMap((box, index) =>
      segmentHitsBox(position, mlp, solid(box))
        ? [
            warning(
              'W4',
              [channel, roomObjectId('furniture', index)],
              `${furnitureLabel(box, index)} blocks the direct sound from ${name} to the MLP.`,
            ),
          ]
        : [],
    ),
  )

/**
 * W6: a listener-level speaker's tweeter (its acoustic centre) or woofer
 * is at most PLACEMENT_WARNINGS.W6.meters above a furniture box's top,
 * with the box between it and the MLP on the floor plan (under it counts).
 */
const speakerJustAboveFurniture: WarningRule = ({
  roomObjects,
  mlp,
  speakers,
}) =>
  speakers.flatMap(({ channel, name, position, woofer }) =>
    roomObjects.furniture.flatMap((box, index) => {
      const justAbove = [position.z, woofer.z].some((z) => {
        const above = z - box.height
        return above >= 0 && above <= PLACEMENT_WARNINGS.W6.meters
      })
      return justAbove && segmentHitsBox(position, mlp, column(box))
        ? [
            warning(
              'W6',
              [channel, roomObjectId('furniture', index)],
              `${name} is just above the top of ${furnitureLabel(box, index)}, which reflects its sound to the MLP.`,
            ),
          ]
        : []
    }),
  )

/** W7: the MLP closer than PLACEMENT_WARNINGS.W7.meters to the back wall. */
const mlpNearBackWall: WarningRule = ({ room, mlp }) =>
  room.length - mlp.y < PLACEMENT_WARNINGS.W7.meters
    ? [
        warning(
          'W7',
          [MLP_ID],
          'The MLP is close to the back wall: a strong reflection arrives right behind your head. The extra bass there is already in the estimated response.',
        ),
      ]
    : []

/** Every rule, in the order of their ids. */
const RULES: readonly WarningRule[] = [
  speakerBlocksDoor,
  speakerInFrontOfWindow,
  subwooferNearDoorway,
  furnitureBlocksDirectSound,
  reflectionsDiffer,
  speakerJustAboveFurniture,
  mlpNearBackWall,
]

/** Every placement warning for the placed room, rule by rule. */
export function placementWarnings(input: WarningInput): PlacementWarning[] {
  return RULES.flatMap((rule) => rule(input))
}

/** The warnings that are about `item`. */
export function warningsAbout(
  warnings: readonly PlacementWarning[],
  item: WarnedItem,
): PlacementWarning[] {
  return warnings.filter(({ items }) => items.includes(item))
}
