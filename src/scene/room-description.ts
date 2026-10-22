import {
  formatLength,
  frontStageDistances,
  type RoomAnalysis,
  type SeatHeatmap,
  type SeatRecommendation,
  type UnitSystem,
} from '@/domain'
import { describeHeatmap } from '@/scene/heatmap'
import type { CameraView } from '@/scene/orbit'
import {
  describeRoomObjects,
  type RoomObjectsInView,
} from '@/scene/room-objects'
import {
  describeOverhead,
  describeSpeaker,
  describeSubwoofer,
} from '@/scene/speakers'

/** What the room view says in words: the scene for a screen reader. */
export type RoomViewDescriptionInput = {
  /** The Room analysis: the layout and where its items are. */
  readonly analysis: Pick<
    RoomAnalysis,
    'layout' | 'mlp' | 'speakers' | 'overheads' | 'subwoofers'
  >
  /** The Room and its room objects as the room view draws them. */
  readonly objectsInView: RoomObjectsInView
  /** The recommended seat, or null while it is not worked out. */
  readonly recommendation: SeatRecommendation | null
  /** The seat-score heatmap when it is shown, else null. */
  readonly heatmap: SeatHeatmap | null
  readonly units: UnitSystem
  readonly view: CameraView
}

/**
 * The room view's text description, one paragraph per entry, in reading
 * order (empty ones left out): the room and the MLP, the listener-level
 * speakers, the front-stage distances to the MLP, the overheads, the
 * subwoofers, the room objects, the recommended seat and, when shown, the
 * seat-score heatmap. The scene's label joins them; without WebGL each is
 * a paragraph of its own.
 */
export function describeRoomView({
  analysis: { layout, mlp, speakers, overheads, subwoofers },
  objectsInView,
  recommendation,
  heatmap,
  units,
  view,
}: RoomViewDescriptionInput): readonly string[] {
  const { room } = objectsInView
  const roomDescription =
    view === '3d'
      ? `3D view of the room, ${formatLength(room.length, units)} long, ` +
        `${formatLength(room.width, units)} wide and ` +
        `${formatLength(room.height, units)} high, seen from behind the ` +
        `seats, with the MLP ${formatLength(mlp.y, units)} from the front wall.`
      : `Top-down view of the room, ${formatLength(room.length, units)} long ` +
        `and ${formatLength(room.width, units)} wide, with the front wall at ` +
        `the top and the MLP ${formatLength(mlp.y, units)} from the front wall.`
  const speakersDescription =
    `${layout.name} listener-level speakers, angle from the MLP ` +
    `and Dolby placement-range grade: ` +
    `${speakers.map(describeSpeaker).join(', ')}.`
  const overheadsDescription =
    overheads.length > 0
      ? `${overheads.length} overhead speakers on the ceiling, angle and ` +
        `elevation from the MLP and Dolby placement-range grade: ` +
        `${overheads.map(describeOverhead).join(', ')}.`
      : ''
  const subwoofersDescription =
    `${subwoofers.length} ${subwoofers.length === 1 ? 'subwoofer' : 'subwoofers'}, ` +
    `not graded as Dolby gives subwoofers no placement range: ` +
    `${subwoofers.map(describeSubwoofer).join(', ')}.`
  return [
    roomDescription,
    speakersDescription,
    describeFrontStageDistances({ mlp, speakers }, units),
    overheadsDescription,
    subwoofersDescription,
    describeRoomObjects(objectsInView, units),
    describeSeat(recommendation, units),
    describeHeatmap(heatmap, units),
  ].filter(Boolean)
}

/**
 * How far the front-stage speakers are from the MLP, for example "Front
 * speakers from the MLP: Left 1.98 m, Center 1.78 m, Right 1.98 m.", or
 * '' when the layout has none.
 */
export function describeFrontStageDistances(
  items: Parameters<typeof frontStageDistances>[0],
  units: UnitSystem,
): string {
  const distances = frontStageDistances(items)
  if (distances.length === 0) return ''
  const listed = distances
    .map(({ name, meters }) => `${name} ${formatLength(meters, units)}`)
    .join(', ')
  return `Front speakers from the MLP: ${listed}.`
}

/** Where the recommended seat is, or '' while it is not worked out. */
function describeSeat(
  recommendation: SeatRecommendation | null,
  units: UnitSystem,
): string {
  if (!recommendation) return ''
  return recommendation.mlpIsRecommended
    ? 'The MLP is at the recommended seat (an estimate).'
    : `The recommended seat (an estimate) is ringed, ` +
        `${formatLength(recommendation.recommended.position.y, units)} ` +
        `from the front wall.`
}
