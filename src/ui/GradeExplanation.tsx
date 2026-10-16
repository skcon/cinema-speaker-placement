import { useId } from 'react'
import { ANGLE_GRADING, type PlacementGrading } from '@/domain'
import { GRADE_STYLES } from '@/scene/speakers'
import {
  explainGrade,
  GRADE_MEANINGS,
  type AngleExplanation,
  type FormattedCitation,
  type RangeExplanation,
} from '@/ui/lib/grade-explanation'

/**
 * A speaker's placement-range grade explained: each measured angle with
 * its grade, the ranges it was graded against with their sources and any
 * notes, and what the grades mean. A subwoofer says why it isn't graded.
 */
export function GradeExplanation({ grading }: { grading: PlacementGrading }) {
  const headingId = useId()
  const explanation = explainGrade(grading)

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 border-t pt-2 text-xs"
    >
      <h4 id={headingId} className="font-medium">
        Grade
      </h4>
      {explanation.graded ? (
        <>
          {explanation.angles.map((angle) => (
            <Angle key={angle.name} angle={angle} />
          ))}
          <dl className="flex flex-col gap-0.5 text-muted-foreground">
            {GRADE_MEANINGS.map(({ grade, name, meaning }) => (
              <div key={grade}>
                <dt className="inline font-medium text-foreground">{name}:</dt>{' '}
                <dd className="inline">{meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground">{ANGLE_GRADING.assumption}</p>
        </>
      ) : (
        <>
          <p>Not graded. {explanation.reason}</p>
          <Sources sources={explanation.sources} />
        </>
      )}
    </section>
  )
}

function Angle({
  angle: { name, measuredAs, grade, reading, ranges, note },
}: {
  angle: AngleExplanation
}) {
  const color = grade && GRADE_STYLES[grade].color
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{name}</span>
        <span className="font-medium tabular-nums">{reading}</span>
        {color && (
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-xs"
            style={{ backgroundColor: color }}
          />
        )}
      </p>
      <p className="text-muted-foreground">{measuredAs}</p>
      {note && <p>{note}</p>}
      {ranges.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {ranges.map((range) => (
            <Range key={range.name} range={range} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Range({
  range: { name, range, sources, note, assumption },
}: {
  range: RangeExplanation
}) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-1.5">
      <p>
        <span className="text-muted-foreground">{name}</span>{' '}
        <span className="font-medium tabular-nums">{range ?? 'none'}</span>
      </p>
      {note && <p>{note}</p>}
      {assumption && <p className="italic">{assumption}</p>}
      <Sources sources={sources} />
    </li>
  )
}

function Sources({ sources }: { sources: readonly FormattedCitation[] }) {
  if (sources.length === 0) return null
  return (
    <div className="text-muted-foreground">
      Sources:
      <ul className="list-disc pl-4">
        {sources.map(({ title, url, detail }, index) => (
          <li key={index} className="break-words">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                {title}
              </a>
            ) : (
              title
            )}
            {detail && `, ${detail}`}
          </li>
        ))}
      </ul>
    </div>
  )
}
