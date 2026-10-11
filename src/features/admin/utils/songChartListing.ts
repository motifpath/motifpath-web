import type { components } from '@/api/generated/core-domain'

type SongChartSummary = components['schemas']['SongChartSummary']

export type SongChartRowStatus = 'draft' | 'published' | 'withdrawn' | 'unpublishedChanges'

/**
 * Where a chart stands for its list row: a draft never published, published, withdrawn, or
 * published with changes made to its draft since its latest revision was published.
 */
export function songChartRowStatus(chart: SongChartSummary): SongChartRowStatus {
  if (chart.status !== 'published') return chart.status
  const publishedAt = chart.published_revision?.published_at
  return publishedAt && Date.parse(chart.updated_at) > Date.parse(publishedAt) ? 'unpublishedChanges' : 'published'
}

/** Whether two moments fall on the same calendar day where the admin is. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
