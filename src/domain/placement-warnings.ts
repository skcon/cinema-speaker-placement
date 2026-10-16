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
 * warnings. Adding a rule (doors and windows in #57: W1, W2, W3, W5) means
 * adding its reference data, a function below and a line in RULES.
 */
import { segmentHitsBox, type AxisBox } from './box-geometry'
import type { ChannelId, OverheadChannelId } from './dolby-layouts'
import {
  furnitureId,
  furnitureLabel,
  furnitureSolid,
  type FurnitureBox,
} from './furniture'
import { MLP_ID, type PlaceableId } from './manual-positions'
import {
  PLACEMENT_WARNINGS,
  type Citation,
  type SourceClass,
} from './reference'
import type { RoomObjectId, RoomObjects } from './room-objects'
import type { Room, RoomPoint } from './room'
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
              [channel, furnitureId(index)],
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
              [channel, furnitureId(index)],
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
  furnitureBlocksDirectSound,
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
