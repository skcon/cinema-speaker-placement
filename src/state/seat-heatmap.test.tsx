import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  recommendSeat,
  type SeatRecommendation,
} from '@/domain'
import {
  SeatRecommendationContext,
  useSeatHeatmap,
} from '@/state/config-context'

const recommendation = recommendSeat(DEFAULT_CONFIG)

/** Renders useSeatHeatmap with `value` as the shared recommendation. */
function renderSeatHeatmap(value: SeatRecommendation | null, enabled: boolean) {
  return renderHook((on: boolean) => useSeatHeatmap(on), {
    initialProps: enabled,
    wrapper: ({ children }: { children: ReactNode }) => (
      <SeatRecommendationContext value={value}>
        {children}
      </SeatRecommendationContext>
    ),
  })
}

describe('the seat-score heatmap hook', () => {
  it('is the shared recommendation as a heatmap, ringing its recommended seat', () => {
    const { result } = renderSeatHeatmap(recommendation, true)

    expect(result.current?.cells).toHaveLength(recommendation.candidates.length)
    expect(result.current?.recommended).toEqual(
      recommendation.recommended.position,
    )
  })

  it('is null while the heatmap is off', () => {
    expect(renderSeatHeatmap(recommendation, false).result.current).toBeNull()
  })

  it('is null while the recommendation is still worked out', () => {
    expect(renderSeatHeatmap(null, true).result.current).toBeNull()
  })

  it('keeps the same heatmap while the recommendation stays the same', () => {
    const { result, rerender } = renderSeatHeatmap(recommendation, true)
    const first = result.current

    rerender(true)

    expect(result.current).toBe(first)
  })
})
