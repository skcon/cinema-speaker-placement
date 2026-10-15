import { useId, type ReactNode } from 'react'
import { useRoomAnalysis } from '@/state/config-context'
import { GRADE_STYLES, overheadAngles, UNGRADED_STYLE } from '@/scene/speakers'
import { SidebarSubsection } from '@/ui/SidebarSection'

/**
 * The layout's speakers by Dolby's spelled-out names, with the abbreviation
 * the room view labels them by, their angle from the MLP and their
 * placement-range grade (in words, with the room view's color), then the
 * overheads, also graded on their elevation, then the subwoofers, which
 * are not graded.
 */
export function SpeakerList() {
  const noteId = useId()
  const { speakers, overheads, subwoofers } = useRoomAnalysis()

  return (
    <SidebarSubsection title="Angles and grades">
      <table
        aria-label="Speakers"
        aria-describedby={noteId}
        className="w-full text-sm"
      >
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="pb-1 text-left font-normal">
              Speaker
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Angle <span className="sr-only">from MLP</span>
            </th>
            <th scope="col" className="pb-1 pl-3 text-left font-normal">
              Grade
            </th>
          </tr>
        </thead>
        <tbody>
          {speakers.map(({ channel, name, placementRange }) => (
            <SpeakerRow
              key={channel}
              abbreviation={channel}
              name={name}
              angle={`${placementRange.azimuth.shown}°`}
              grade={GRADE_STYLES[placementRange.grade]}
            />
          ))}
          {overheads.map((overhead) => (
            <SpeakerRow
              key={overhead.channel}
              abbreviation={overhead.channel}
              name={overhead.name}
              angle={overheadAngles(overhead)}
              grade={GRADE_STYLES[overhead.placementRange.grade]}
            />
          ))}
          {subwoofers.map(({ id, name }) => (
            <SpeakerRow
              key={id}
              abbreviation={id}
              name={name}
              angle={
                <>
                  <span aria-hidden>—</span>
                  <span className="sr-only">none</span>
                </>
              }
              grade={UNGRADED_STYLE}
            />
          ))}
        </tbody>
      </table>
      <p id={noteId} className="text-xs text-muted-foreground">
        Angles are measured from the MLP, from straight ahead at the screen, and
        graded against Dolby&rsquo;s placement range for each speaker. Overhead
        speakers are also graded on their elevation (elev.), measured as Dolby
        draws it from the side: 0° straight ahead, 90° overhead, 180° straight
        behind. Dolby gives top middle speakers no angle range from straight
        ahead, so they are graded on their elevation only. Subwoofers have no
        Dolby placement range, so they aren&rsquo;t graded: they follow the
        layouts that evened out the bass across the seats in a Harman study of
        one test room, scaled to your room.
      </p>
    </SidebarSubsection>
  )
}

function SpeakerRow({
  abbreviation,
  name,
  angle,
  grade: { color, label },
}: {
  abbreviation: string
  name: string
  angle: ReactNode
  grade: { color: string; label: string }
}) {
  return (
    <tr className="border-t">
      <td className="py-1">
        <span className="flex gap-1">
          <span className="w-9 shrink-0 font-medium">{abbreviation}</span>
          <span>{name}</span>
        </span>
      </td>
      <td className="py-1 text-right tabular-nums">{angle}</td>
      <td className="py-1 pl-3">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-xs"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
      </td>
    </tr>
  )
}
