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
import { CHANNELS } from './dolby-layouts'
import {
  HEADROOM_MODEL,
  HEADROOM_STATUS,
  REFERENCE_LEVEL,
  SUBWOOFER_SENSITIVITY,
} from './reference'
import { distanceBetween, type RoomPoint } from './room'
import {
  SPEAKER_GROUP_NAMES,
  SPEAKER_GROUP_OF,
  type OverheadSpecs,
  type SpeakerChannelId,
  type SpeakerGroupId,
  type SpeakerGroups,
  type SpeakerSpecs,
  type SubwooferSpecs,
} from './speaker-specs'
import { SUBWOOFERS, type SubwooferId } from './subwoofer-arrangements'
import { fromInches } from './units'

/**
 * How far a full-scale peak is above the reference level: the reference
 * level is measured with a test signal this far below full scale.
 */
const PEAK_ABOVE_REFERENCE_DB = -REFERENCE_LEVEL.testSignalDbfs

/** The loudest peak a channel is asked to play at the MLP (reference peak). */
const REFERENCE_PEAK_DB =
  REFERENCE_LEVEL.calibrationDb + PEAK_ABOVE_REFERENCE_DB

/** What a speaker or subwoofer can play at the MLP. */
export type SplAtMlp = {
  /** From it to the MLP, in meters. */
  readonly distance: number
  /** The SPL it can reach at the MLP with its full power, in dB. */
  readonly maxSpl: number
}

/** One Speaker's headroom at the MLP. */
export type ChannelHeadroom = SplAtMlp & {
  readonly channel: SpeakerChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** How far its max SPL is above the reference peak, in dB (negative: short). */
  readonly headroomDb: number
}

/**
 * A speaker group's headroom: its weakest speaker's. A group the layout
 * uses but whose speakers aren't placed (the overheads until #8) is listed
 * without one, so placing them is all it takes to check them.
 */
export type GroupHeadroom = {
  readonly group: SpeakerGroupId
  /** For example "Front L/R". */
  readonly name: string
  readonly specs: SpeakerSpecs | OverheadSpecs
  /** The group's placed speakers, in the layout's channel order. */
  readonly channels: readonly ChannelHeadroom[]
} & (
  | { readonly placed: false }
  | {
      readonly placed: true
      /** The speaker with the least headroom: usually the farthest. */
      readonly weakest: ChannelHeadroom
      /** The weakest speaker's headroom, in dB. */
      readonly headroomDb: number
      readonly status: HeadroomStatus
      /**
       * The amplifier power per channel that would give the weakest
       * speaker enough headroom (HEADROOM_STATUS.enoughFromDb), in watts.
       */
      readonly wattsForEnough: number
    }
)

/** The Subwoofers' rough headroom at the MLP, all of them together. */
export type SubwooferHeadroom = {
  /** The LFE's peak at the MLP, in dB: the reference peak plus the LFE gain. */
  readonly targetDb: number
  /**
   * Each subwoofer on its own, Subwoofer 1 first, driven at its RMS power:
   * the peak power is not used (yet), the conservative choice.
   */
  readonly subwoofers: readonly (SplAtMlp & {
    readonly id: SubwooferId
    readonly name: string
    /** Its rough sensitivity from driver size and enclosure (ours). */
    readonly sensitivity: number
  })[]
  /** All of them together (a power sum), in dB. */
  readonly maxSpl: number
  readonly headroomDb: number
  readonly status: HeadroomStatus
}

/** SPL headroom at the MLP: an estimate, never a measurement. */
export type HeadroomAnalysis = {
  /** Dolby's reference (calibration) level per channel at the MLP, dB SPL(C). */
  readonly referenceLevelDb: number
  /** How far a full-scale peak is above the reference level, in dB. */
  readonly peakAboveReferenceDb: number
  /** The reference peak per channel at the MLP, in dB SPL. */
  readonly referencePeakDb: number
  /** How much louder the LFE channel plays than a full-range one, in dB. */
  readonly lfeGainDb: number
  /** From how many dB of headroom a group or the subwoofers have enough. */
  readonly enoughFromDb: number
  /** The amplifier power per channel the speakers are checked with, in W. */
  readonly amplifierWatts: number
  /** Every speaker group the layout uses, in form order. */
  readonly groups: readonly GroupHeadroom[]
  readonly subwoofers: SubwooferHeadroom
}

/** What the headroom estimate needs: the specs, and where everything is. */
export type HeadroomInput = {
  readonly mlp: RoomPoint
  readonly speakerGroups: SpeakerGroups
  readonly amplifierWatts: number
  /** The speaker groups the layout uses (speakerGroupsIn), in form order. */
  readonly groups: readonly SpeakerGroupId[]
  /** The placed Speakers. */
  readonly speakers: readonly {
    readonly channel: SpeakerChannelId
    readonly position: RoomPoint
  }[]
  readonly subwoofers: readonly {
    readonly id: SubwooferId
    readonly position: RoomPoint
    readonly specs: SubwooferSpecs
  }[]
}

/** Estimate every Speaker's and the Subwoofers' headroom at the MLP. */
export function estimateHeadroom({
  mlp,
  speakerGroups,
  amplifierWatts,
  groups,
  speakers,
  subwoofers,
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

  const groupRows = groups.map((group): GroupHeadroom => {
    const inGroup = channels.filter(
      ({ channel }) => SPEAKER_GROUP_OF[channel] === group,
    )
    const row = {
      group,
      name: SPEAKER_GROUP_NAMES[group],
      specs: speakerGroups[group].specs,
      channels: inGroup,
    }
    const [first, ...rest] = inGroup
    if (!first) return { ...row, placed: false }
    const weakest = rest.reduce(
      (low, c) => (c.headroomDb < low.headroomDb ? c : low),
      first,
    )
    return {
      ...row,
      placed: true,
      weakest,
      headroomDb: weakest.headroomDb,
      status: headroomStatus(weakest.headroomDb),
      wattsForEnough: wattsForHeadroom({
        watts: amplifierWatts,
        headroomDb: weakest.headroomDb,
        wantedDb: HEADROOM_STATUS.enoughFromDb,
      }),
    }
  })

  // RMS power on purpose: the conservative choice; peak power isn't used.
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
    referenceLevelDb: REFERENCE_LEVEL.calibrationDb,
    peakAboveReferenceDb: PEAK_ABOVE_REFERENCE_DB,
    referencePeakDb: REFERENCE_PEAK_DB,
    lfeGainDb: REFERENCE_LEVEL.lfeGainDb,
    enoughFromDb: HEADROOM_STATUS.enoughFromDb,
    amplifierWatts,
    groups: groupRows,
    subwoofers: {
      targetDb,
      subwoofers: subs,
      maxSpl: subMaxSpl,
      headroomDb: subMaxSpl - targetDb,
      status: headroomStatus(subMaxSpl - targetDb),
    },
  }
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
