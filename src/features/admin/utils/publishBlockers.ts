import type { components } from '@/api/generated/core-domain'
import type { ChordCheck, ChordCheckKind } from '@/shared/utils/chordCheck'

type SongChartDocument = components['schemas']['SongChartDocument']
type SectionAttrs = components['schemas']['SongChartSection']['attrs']
type UnplayedProgression = components['schemas']['SongChartUnplayedProgression']

/** One reason a draft can't be published: its rights, a chord where it is written, or a section's tag it doesn't play. */
export type PublishBlocker =
  | { kind: 'rights' }
  | { kind: 'chord'; anchorId: string; symbol: string; problem: ChordCheckKind; section: SectionAttrs; line: number }
  | { kind: 'progression'; progressionKey: string; section: SectionAttrs }

/**
 * Every reason the draft can't be published yet, the rights first, then each chord that blocks
 * it, in the order it is written, with its section and its lyric line in that section (counted
 * from 1, comments left out), then each tag a section doesn't play. A chord the catalog hasn't
 * answered for yet isn't listed.
 */
export function publishBlockers(
  body: SongChartDocument,
  rightsConfirmed: boolean,
  checkOf: (symbol: string) => ChordCheck | null,
  unplayed: UnplayedProgression[] = [],
): PublishBlocker[] {
  const blockers: PublishBlocker[] = rightsConfirmed ? [] : [{ kind: 'rights' }]
  for (const section of body.content) {
    let line = 0
    for (const content of section.content) {
      if (content.type !== 'lyricLine') continue
      line += 1
      for (const run of content.content) {
        const anchor = run.marks?.[0]?.attrs
        const check = anchor ? checkOf(anchor.writtenSymbol) : null
        if (anchor && check?.blocks) {
          blockers.push({ kind: 'chord', anchorId: anchor.anchorId, symbol: anchor.writtenSymbol, problem: check.kind, section: section.attrs, line })
        }
      }
    }
  }
  for (const u of unplayed) {
    const section = body.content[u.section_index]
    if (section) blockers.push({ kind: 'progression', progressionKey: u.progression_key, section: section.attrs })
  }
  return blockers
}
