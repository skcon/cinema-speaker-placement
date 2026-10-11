import { useId } from 'react'
import { useRoomAnalysis } from '@/state/config-context'
import { GRADE_STYLES } from '@/scene/speakers'

/**
 * The layout's speakers by Dolby's spelled-out names, with the abbreviation
 * the room view labels them by, their angle from the MLP and their
 * placement-range grade (in words, with the room view's color).
 */
export function SpeakerList() {
  const headingId = useId()
  const noteId = useId()
  const { speakers } = useRoomAnalysis()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-semibold">
        Speakers
      </h3>
      <table
        aria-labelledby={headingId}
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
          {speakers.map(({ channel, name, placementRange }) => {
            const { color, label } = GRADE_STYLES[placementRange.grade]
            return (
              <tr key={channel} className="border-t">
                <td className="py-1">
                  <span className="flex gap-1">
                    <span className="w-8 shrink-0 font-medium">{channel}</span>
                    <span>{name}</span>
                  </span>
                </td>
                <td className="py-1 text-right tabular-nums">
                  {placementRange.azimuth.shown}°
                </td>
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
          })}
        </tbody>
      </table>
      <p id={noteId} className="text-xs text-muted-foreground">
        Angles are measured from the MLP, from straight ahead at the screen, and
        graded against Dolby&rsquo;s placement range for each speaker.
      </p>
    </section>
  )
}
