import { lazy, Suspense, useId } from 'react'
import { formatDb, formatHz, formatHzRange } from '@/charts/format'
import { strengthText, weaknessText } from '@/charts/notes-text'
import { TARGET_CURVE_KINDS, TARGET_CURVES, TARGET_TOLERANCE } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'

// Recharts is only needed for the plot, so it loads after the first paint.
const ResponsePlot = lazy(() =>
  import('@/charts/ResponsePlot').then((module) => ({
    default: module.ResponsePlot,
  })),
)

/**
 * The estimate's weaknesses and strengths, each with its likely cause, as
 * two labelled lists.
 */
function ResponseNotesList() {
  const weaknessesId = useId()
  const strengthsId = useId()
  const { weaknesses, strengths } = useRoomAnalysis().response.notes
  return (
    <section className="flex flex-col gap-3 text-sm sm:flex-row sm:gap-6">
      <div className="flex flex-col gap-1 sm:flex-1">
        <h3 id={weaknessesId} className="font-medium">
          Weaknesses
        </h3>
        {weaknesses.length > 0 ? (
          <ul aria-labelledby={weaknessesId} className="list-disc pl-5">
            {weaknesses.map((weakness) => {
              const text = weaknessText(weakness)
              return <li key={text}>{text}</li>
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            No peak or dip outside the ±{TARGET_TOLERANCE.db} dB band.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 sm:flex-1">
        <h3 id={strengthsId} className="font-medium">
          Strengths
        </h3>
        {strengths.length > 0 ? (
          <ul aria-labelledby={strengthsId} className="list-disc pl-5">
            {strengths.map((strength) => {
              const text = strengthText(strength)
              return <li key={text}>{text}</li>
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">None found by this model.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Likely causes in this simplified model, matched by frequency: a guide
          to what to try, not a diagnosis.
        </p>
      </div>
    </section>
  )
}

/** The look of the chosen target curve, as in the layout form's pickers. */
const CHOSEN_OPTION =
  'px-2 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/**
 * The estimated response panel's content: the target curve picker, the
 * chart, the estimate in words (also the chart's text alternative), the
 * model's assumptions and a table of the values.
 */
export function ResponsePanel() {
  const pickerLabelId = useId()
  const summaryId = useId()
  const targetCurve = useConfig((state) => state.config.targetCurve)
  const setTargetCurve = useConfig((state) => state.setTargetCurve)
  const { response } = useRoomAnalysis()
  const { summary, estimated, tableRows } = response
  const { rows, reliableFrom, model } = estimated
  const target = TARGET_CURVES[targetCurve].name
  const lowest = rows[0]?.frequency ?? 0
  const highest = rows.at(-1)?.frequency ?? 0
  const hasUnreliable = reliableFrom !== undefined && reliableFrom > lowest
  const summarized = formatHzRange(
    hasUnreliable ? reliableFrom : lowest,
    highest,
  )

  const summaryText =
    `Within ±${TARGET_TOLERANCE.db} dB of the ${target} over ` +
    `${Math.round(summary.withinTolerance * 100)}% of ${summarized}. ` +
    `Largest peak: ${formatDb(summary.largestPeak.deviation)} at ` +
    `${formatHz(summary.largestPeak.frequency)}. ` +
    `Deepest dip: ${formatDb(summary.deepestDip.deviation)} at ` +
    `${formatHz(summary.deepestDip.frequency)}.`

  return (
    // Never shorter than its content: on wide screens the panel scrolls
    // instead, and the chart takes any room left over. Relative, so the
    // table's visually hidden caption stays inside the scrolling panel.
    <div className="relative flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span id={pickerLabelId} className="text-sm font-medium">
          Target curve
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-labelledby={pickerLabelId}
          value={targetCurve}
          onValueChange={(value) => {
            // Clicking the chosen option again sends '' (nothing chosen): ignore it.
            const chosen = TARGET_CURVE_KINDS.find((kind) => kind === value)
            if (chosen) setTargetCurve(chosen)
          }}
        >
          {TARGET_CURVE_KINDS.map((kind) => (
            <ToggleGroupItem key={kind} value={kind} className={CHOSEN_OPTION}>
              {TARGET_CURVES[kind].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div
        role="img"
        aria-label={`Chart of the estimated response at the MLP against the ${target}, ${formatHzRange(lowest, highest)} on a log frequency axis.`}
        aria-describedby={summaryId}
        className="relative h-64 w-full lg:h-auto lg:min-h-60 lg:flex-1"
      >
        <Suspense fallback={null}>
          <ResponsePlot estimated={estimated} />
        </Suspense>
      </div>
      <div id={summaryId} className="flex flex-col gap-1 text-sm">
        <p>{summaryText}</p>
        {hasUnreliable && (
          <p>
            Below {formatHz(reliableFrom)}, the lowest room mode the subwoofers
            excite, the estimate isn&rsquo;t reliable: it is shaded on the chart
            and left out of these numbers.
          </p>
        )}
      </div>
      <ResponseNotesList />
      <p className="text-xs text-muted-foreground">
        Room modes up to {model.roomModesUpTo} Hz for all subwoofers playing the
        same bass together, each rolled off by its enclosure (corner frequencies
        are our assumption); assumes a {model.reverberationTime} s reverberation
        time at low frequencies. Above the {formatHz(model.crossoverHz)}{' '}
        crossover (a Linkwitz-Riley 24 dB/octave model), the Left and Right
        speakers with reflections off their three nearest surfaces, treated as
        rigid, with speakers radiating equally in all directions. Room gain
        below the lowest mode isn&rsquo;t modelled.
        {targetCurve === 'house' &&
          ' The house curve is our own assumption (a gentle bass boost below about 100 Hz), not a published standard.'}
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Show the values as a table
        </summary>
        <table className="mt-2 w-full max-w-sm tabular-nums">
          <caption className="sr-only">
            Estimated response and target by frequency
          </caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="pb-1 text-left font-normal">
                Frequency
              </th>
              <th scope="col" className="pb-1 text-right font-normal">
                Estimate
              </th>
              <th scope="col" className="pb-1 text-right font-normal">
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.frequency} className="border-t">
                <td className="py-0.5">{formatHz(row.frequency)}</td>
                <td className="py-0.5 text-right">
                  {formatDb(row.estimated)}
                  {!row.reliable && (
                    <span className="text-muted-foreground"> (unreliable)</span>
                  )}
                </td>
                <td className="py-0.5 text-right">{formatDb(row.target)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
