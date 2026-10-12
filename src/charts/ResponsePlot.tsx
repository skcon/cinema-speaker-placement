import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDb, formatHz } from '@/charts/format'
import { TARGET_TOLERANCE, type EstimatedResponse } from '@/domain'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/ui/components/chart'

const CHART_CONFIG = {
  estimated: {
    label: 'Estimate',
    theme: { light: '#2a78d6', dark: '#3987e5' },
  },
  target: { label: 'Target', color: 'var(--muted-foreground)' },
  band: {
    label: `±${TARGET_TOLERANCE.db} dB band`,
    color: 'var(--muted-foreground)',
  },
} satisfies ChartConfig

/** Log-axis ticks a reader can place: each decade split at familiar values. */
const FREQUENCY_TICKS = [
  10, 15, 20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000,
]

/** The y axis in 6 dB steps around the data. */
const LEVEL_STEP = 6

/** Axis ticks every LEVEL_STEP dB, from just below to just above `levels`. */
function stepTicks(levels: readonly number[]): number[] {
  const low = Math.floor(Math.min(...levels) / LEVEL_STEP)
  const high = Math.ceil(Math.max(...levels) / LEVEL_STEP)
  return Array.from(
    { length: high - low + 1 },
    (_, i) => (low + i) * LEVEL_STEP,
  )
}

/**
 * The estimated response against the target curve and its tolerance band,
 * on a log frequency axis. Draws what the domain derived; no acoustics here.
 */
export function ResponsePlot({ estimated }: { estimated: EstimatedResponse }) {
  // Recharts draws a range area from a [low, high] pair.
  const rows = estimated.rows.map((row) => ({
    ...row,
    band: [row.low, row.high],
  }))
  const lowest = rows[0]?.frequency ?? 1
  const highest = rows.at(-1)?.frequency ?? 1
  const frequencyTicks = FREQUENCY_TICKS.filter(
    (hz) => hz >= lowest && hz <= highest,
  )
  const levelTicks = stepTicks(
    rows.flatMap(({ estimated, low, high }) => [estimated, low, high]),
  )
  const { reliableFrom } = estimated

  return (
    <ChartContainer
      config={CHART_CONFIG}
      className="absolute inset-0 aspect-auto"
    >
      <ComposedChart
        data={rows}
        margin={{ top: 4, right: 8, bottom: 16, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="frequency"
          type="number"
          scale="log"
          domain={[lowest, highest]}
          ticks={frequencyTicks}
          tickFormatter={(hz: number) => String(hz)}
          tickLine={false}
          label={{
            value: 'Frequency (Hz)',
            position: 'insideBottom',
            offset: -12,
            className: 'fill-muted-foreground',
          }}
        />
        <YAxis
          type="number"
          domain={[levelTicks[0]!, levelTicks.at(-1)!]}
          ticks={levelTicks}
          tickLine={false}
          width={44}
          label={{
            value: 'Level (dB)',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            className: 'fill-muted-foreground',
          }}
        />
        {reliableFrom !== undefined && reliableFrom > lowest && (
          // Below the lowest mode the subwoofers excite: not reliable.
          <ReferenceArea
            x1={lowest}
            x2={Math.min(reliableFrom, highest)}
            fill="var(--muted-foreground)"
            fillOpacity={0.12}
            stroke="none"
            label={{
              value: 'Unreliable',
              position: 'insideTopLeft',
              className: 'fill-muted-foreground text-[10px]',
            }}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const row: unknown = payload[0]?.payload
                return row &&
                  typeof row === 'object' &&
                  'frequency' in row &&
                  typeof row.frequency === 'number'
                  ? formatHz(row.frequency)
                  : ''
              }}
              formatter={(value, name) =>
                typeof value === 'number' ? (
                  <span className="flex w-full justify-between gap-3">
                    <span className="text-muted-foreground">
                      {CHART_CONFIG[name as 'estimated' | 'target'].label}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatDb(value)}
                    </span>
                  </span>
                ) : null
              }
            />
          }
        />
        <Area
          dataKey="band"
          type="monotone"
          stroke="none"
          fill="var(--color-band)"
          fillOpacity={0.15}
          isAnimationActive={false}
          activeDot={false}
          tooltipType="none"
        />
        <Line
          dataKey="target"
          type="monotone"
          stroke="var(--color-target)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="estimated"
          type="monotone"
          stroke="var(--color-estimated)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  )
}
