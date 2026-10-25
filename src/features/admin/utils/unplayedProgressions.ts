import type { components } from '@/api/generated/core-domain'

type SongChartDocument = components['schemas']['SongChartDocument']
type UnplayedProgression = components['schemas']['SongChartUnplayedProgression']

/**
 * The tags the last save found a section doesn't play, as they stand for the lyrics being edited.
 * The server checks them on save and names each section by its place in the chart, so a tag
 * removed since no longer counts, and while sections were added or removed since, no place can
 * be trusted and none is given until the next save.
 */
export function unplayedProgressions(
  body: SongChartDocument,
  saved: { body: SongChartDocument; unplayed_progressions: UnplayedProgression[] } | null,
): UnplayedProgression[] {
  if (!saved || saved.body.content.length !== body.content.length) return []
  return saved.unplayed_progressions.filter((u) => body.content[u.section_index]?.attrs.progression_keys?.includes(u.progression_key))
}
