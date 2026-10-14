/**
 * SPL headroom at the MLP (issue #2, user stories 15, 16, 18 and 47): how
 * far above the reference peak level each Speaker and the Subwoofers can
 * play there, estimated from sensitivity, amplifier power and distance.
 *
 * A rough free-field estimate (HEADROOM_MODEL, SUBWOOFER_SENSITIVITY in
 * reference.ts): it leaves out room gain, power compression and the real
 * speakers' dispersion, so it is a hint at whether gear is underpowered,
 * never a measurement.
 */
import { CHANNELS, type ChannelId } from './dolby-layouts'
import {
  HEADROOM_MODEL,
  HEADROOM_STATUS,
  REFERENCE_LEVEL,
  SUBWOOFER_SENSITIVITY,
} from './reference'
import type { RoomPoint } from './room'
import {
  LISTENER_GROUP_IDS,
  SPEAKER_GROUP_NAMES,
  SPEAKER_GROUP_OF,
  type ListenerGroupId,
  type SpeakerGroups,
  type SpeakerSpecs,
  type SubwooferSpecs,
} from './speaker-specs'
import { SUBWOOFERS, type SubwooferId } from './subwoofer-arrangements'
import { fromInches } from './units'

/**
 * The loudest peak a channel is asked to play at the MLP: Dolby's
 * calibration level plus the 20 dB from the test signal to full scale.
 */
const REFERENCE_PEAK_DB =
  REFERENCE_LEVEL.calibrationDb - REFERENCE_LEVEL.testSignalDbfs

/** One Speaker's headroom at the MLP. */
export type ChannelHeadroom = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** From the speaker to the MLP, in meters. */
  readonly distance: number
  /** The SPL it can reach at the MLP with the full amplifier power, in dB. */
  readonly maxSpl: number
  /** How far that is above the reference peak level, in dB (negative: short). */
  readonly headroomDb: number
}

/** A speaker group's headroom: its weakest speaker's. */
export type GroupHeadroom = {
  readonly group: ListenerGroupId
  /** For example "Front L/R". */
  readonly name: string
  readonly specs: SpeakerSpecs
  /** The group's speakers in the layout, in Dolby's channel order. */
  readonly channels: readonly ChannelHeadroom[]
  /** The weakest speaker's headroom, in dB. */
  readonly headroomDb: number
  readonly status: HeadroomStatus
  /**
   * The amplifier power per channel that would give the weakest speaker
   * enough headroom (HEADROOM_STATUS.enoughFromDb), in watts.
   */
  readonly wattsForEnough: number
}

/** The Subwoofers' rough headroom at the MLP, all of them together. */
export type SubwooferHeadroom = {
  /** The LFE's peak level at the MLP, in dB: 10 dB above a channel's. */
  readonly targetDb: number
  /** Each subwoofer on its own, Subwoofer 1 first. */
  readonly subwoofers: readonly {
    readonly id: SubwooferId
    readonly name: string
    readonly distance: number
    /** Its rough sensitivity from driver size and enclosure (ours). */
    readonly sensitivity: number
    readonly maxSpl: number
  }[]
  /** All of them together (a power sum), in dB. */
  readonly maxSpl: number
  readonly headroomDb: number
  readonly status: HeadroomStatus
}

/** SPL headroom at the MLP: an estimate, never a measurement. */
export type HeadroomAnalysis = {
  /** The reference peak level per channel at the MLP, in dB SPL. */
  readonly referencePeakDb: number
  /** The amplifier power per channel the speakers are checked with, in W. */
  readonly amplifierWatts: number
  /** The layout's listener-level speaker groups, in form order. */
  readonly groups: readonly GroupHeadroom[]
  readonly subwoofers: SubwooferHeadroom
  /** Whether the layout has overheads, which aren't placed yet (#8). */
  readonly overheadsNotPlaced: boolean
}

/** What the headroom estimate needs: the specs, and where everything is. */
export type HeadroomInput = {
  readonly mlp: RoomPoint
  readonly speakerGroups: SpeakerGroups
  readonly amplifierWatts: number
  readonly speakers: readonly {
    readonly channel: ChannelId
    readonly position: RoomPoint
  }[]
  readonly subwoofers: readonly {
    readonly id: SubwooferId
    readonly position: RoomPoint
    readonly specs: SubwooferSpecs
  }[]
  readonly hasOverheads: boolean
}

/** Estimate every Speaker's and the Subwoofers' headroom at the MLP. */
export function estimateHeadroom({
  mlp,
  speakerGroups,
  amplifierWatts,
  speakers,
  subwoofers,
  hasOverheads,
}: HeadroomInput): HeadroomAnalysis {
  const channels = speakers.map(({ channel, position }): ChannelHeadroom => {
    const distance = distanceBetween(position, mlp)
    const { sensitivity } = speakerGroups[SPEAKER_GROUP_OF[channel]].specs
    const maxSpl = splAtDistance({
      sensitivity,
      watts: amplifierWatts,
      distance,
    })
    return {
      channel,
      name: CHANNELS[channel].name,
      distance,
      maxSpl,
      headroomDb: maxSpl - REFERENCE_PEAK_DB,
    }
  })

  const groups = LISTENER_GROUP_IDS.flatMap((group): GroupHeadroom[] => {
    const inGroup = channels.filter(
      ({ channel }) => SPEAKER_GROUP_OF[channel] === group,
    )
    if (inGroup.length === 0) return []
    const headroomDb = Math.min(...inGroup.map((c) => c.headroomDb))
    return [
      {
        group,
        name: SPEAKER_GROUP_NAMES[group],
        specs: speakerGroups[group].specs,
        channels: inGroup,
        headroomDb,
        status: headroomStatus(headroomDb),
        wattsForEnough: wattsForHeadroom({
          watts: amplifierWatts,
          headroomDb,
          wantedDb: HEADROOM_STATUS.enoughFromDb,
        }),
      },
    ]
  })

  const subs = subwoofers.map(({ id, position, specs }) => {
    const distance = distanceBetween(position, mlp)
    const sensitivity = subwooferSensitivity(specs)
    return {
      id,
      name: SUBWOOFERS[id].name,
      distance,
      sensitivity,
      maxSpl: splAtDistance({ sensitivity, watts: specs.rmsWatts, distance }),
    }
  })
  const targetDb = REFERENCE_PEAK_DB + REFERENCE_LEVEL.lfeGainDb
  const subMaxSpl = sumLevels(subs.map(({ maxSpl }) => maxSpl))

  return {
    referencePeakDb: REFERENCE_PEAK_DB,
    amplifierWatts,
    groups,
    subwoofers: {
      targetDb,
      subwoofers: subs,
      maxSpl: subMaxSpl,
      headroomDb: subMaxSpl - targetDb,
      status: headroomStatus(subMaxSpl - targetDb),
    },
    overheadsNotPlaced: hasOverheads,
  }
}

/** The straight-line distance between two points, in meters. */
function distanceBetween(a: RoomPoint, b: RoomPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/**
 * The SPL a speaker gives at `distance` meters on its axis with `watts`
 * into it: sensitivity (dB SPL at 1 W, 1 m) + 10·log10(P) − 20·log10(d).
 * Nearer than HEADROOM_MODEL.minDistance counts as that distance.
 */
export function splAtDistance({
  sensitivity,
  watts,
  distance,
}: {
  sensitivity: number
  watts: number
  distance: number
}): number {
  const d = Math.max(distance, HEADROOM_MODEL.minDistance)
  return sensitivity + 10 * Math.log10(watts) - 20 * Math.log10(d)
}

/**
 * Levels in dB added up as a power sum: 10·log10(Σ 10^(L/10)). Two equal
 * levels give 3 dB more.
 */
export function sumLevels(levels: readonly number[]): number {
  return 10 * Math.log10(levels.reduce((sum, l) => sum + 10 ** (l / 10), 0))
}

/**
 * The power that turns `headroomDb` at `watts` into `wantedDb`: every 3 dB
 * more takes twice the power.
 */
export function wattsForHeadroom({
  watts,
  headroomDb,
  wantedDb,
}: {
  watts: number
  headroomDb: number
  wantedDb: number
}): number {
  return watts * 10 ** ((wantedDb - headroomDb) / 10)
}

/** Whether a headroom is comfortable, just enough, or falls short. */
export type HeadroomStatus = 'enough' | 'tight' | 'short'

/** The status of a headroom in dB (HEADROOM_STATUS thresholds). */
export function headroomStatus(headroomDb: number): HeadroomStatus {
  if (headroomDb >= HEADROOM_STATUS.enoughFromDb) return 'enough'
  if (headroomDb >= HEADROOM_STATUS.tightFromDb) return 'tight'
  return 'short'
}

/**
 * A very rough 1 W / 1 m sensitivity for a subwoofer from its driver size
 * and enclosure (SUBWOOFER_SENSITIVITY: our assumption, not a cited value).
 */
export function subwooferSensitivity({
  enclosure,
  driverDiameter,
}: Pick<SubwooferSpecs, 'enclosure' | 'driverDiameter'>): number {
  const { referenceDiameterInches, sealedDb, portedGainDb } =
    SUBWOOFER_SENSITIVITY
  const area =
    20 * Math.log10(driverDiameter / fromInches(referenceDiameterInches))
  return sealedDb + area + (enclosure === 'ported' ? portedGainDb : 0)
}
