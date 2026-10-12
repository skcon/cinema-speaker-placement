import { lazy, Suspense, useId } from 'react'
import {
  RESPONSE_BAND_LABEL,
  TARGET_CURVE_OPTIONS,
  targetName,
} from '@/charts/labels'
import { formatDb, formatHz } from '@/charts/format'
import { TARGET_CURVES, TARGET_TOLERANCE } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'

// Recharts is only needed for the plot, so it loads after the first paint.
const ResponsePlot = lazy(() =>
  import('@/charts/ResponsePlot').then((module) => ({
    default: module.ResponsePlot,
  })),
)

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
  const target = targetName(targetCurve)

  const summaryText =
    `Within ±${TARGET_TOLERANCE.db} dB of the ${target} over ` +
    `${Math.round(summary.withinTolerance * 100)}% of ${RESPONSE_BAND_LABEL}. ` +
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
            const chosen = TARGET_CURVES.find((kind) => kind === value)
            if (chosen) setTargetCurve(chosen)
          }}
        >
          {TARGET_CURVE_OPTIONS.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className={CHOSEN_OPTION}
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div
        role="img"
        aria-label={`Chart of the estimated response at the MLP against the ${target}, ${RESPONSE_BAND_LABEL} on a log frequency axis.`}
        aria-describedby={summaryId}
        className="relative h-64 w-full lg:h-auto lg:min-h-60 lg:flex-1"
      >
        <Suspense fallback={null}>
          <ResponsePlot response={response} />
        </Suspense>
      </div>
      <p id={summaryId} className="text-sm">
        {summaryText}
      </p>
      <p className="text-xs text-muted-foreground">
        Room modes only, for all subwoofers playing the same bass together;
        assumes a {estimated.model.reverberationTime} s reverberation time at
        low frequencies.
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
                <td className="py-0.5 text-right">{formatDb(row.estimated)}</td>
                <td className="py-0.5 text-right">{formatDb(row.target)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
