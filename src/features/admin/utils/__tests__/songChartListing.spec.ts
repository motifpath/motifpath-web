import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { songChartRowStatus } from '@/features/admin/utils/songChartListing'
import { makeRevisionSummary } from '@/shared/testUtils/songChart'

type SongChartSummary = components['schemas']['SongChartSummary']

function summary(overrides: Partial<SongChartSummary>): SongChartSummary {
  return {
    song_chart_id: 'c-1',
    title: 'Amazing Grace',
    artist: 'John Newton',
    language: 'en',
    status: 'published',
    rights_confirmed: true,
    published_revision_number: 1,
    published_revision: makeRevisionSummary(1),
    updated_by: { user_id: 'u-ana', display_name: 'Ana' },
    updated_at: '2026-10-07T12:00:00Z',
    ...overrides,
  }
}

describe('songChartRowStatus', () => {
  it('is published while the draft is as its latest revision left it', () => {
    expect(songChartRowStatus(summary({}))).toBe('published')
  })

  it('has unpublished changes once the draft changed after its latest revision was published', () => {
    expect(songChartRowStatus(summary({ updated_at: '2026-10-08T09:00:00Z' }))).toBe('unpublishedChanges')
  })

  it.each(['draft', 'withdrawn'] as const)('is %s as the chart is', (status) => {
    expect(songChartRowStatus(summary({ status }))).toBe(status)
  })
})
