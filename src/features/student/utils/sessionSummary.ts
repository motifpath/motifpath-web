import type { components } from '@/api/generated/core-domain'
import type { ItemOutcome } from '@/features/student/composables/usePracticeSessionRun'
import { planRows } from '@/features/student/utils/planRows'
import { speedOf } from '@/features/student/utils/tempoLadder'
import type { RatedTake, TakeRating } from '@/features/student/utils/tempoLadder'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Item = components['schemas']['PracticeSessionItem']

/** How a line of the summary went. */
export type SummaryResult =
  /** A play-along: the fastest tempo it was played at, by effective speed, as played, and how that take went. */
  | { kind: 'played'; fastestBpm: number; fastestNoteValue: TempoNoteValue; rating: TakeRating }
  /** A single chord, or a root and fifth, as the student rated it. */
  | { kind: 'rated'; rating: TakeRating }
  /** A minute of changes: the clean changes counted at the tempo played, and the rating they give. */
  | { kind: 'changes'; tempoBpm: number; cleanChanges: number; rating: TakeRating }
  /** A progression key tour: the keys clean at the tour tempo, in quarters, when its last take was rated. */
  | { kind: 'toured'; cleanKeys: number; tourBpm: number }
  /** A guide tone: the bars its best take hit, of its bars. */
  | { kind: 'tapped'; hits: number; bars: number }
  /** One item answered once. */
  | { kind: 'answered'; correct: boolean }
  /** A drill's fretboard cells or diagram shapes, answered many to a session. */
  | { kind: 'counted'; right: number; answered: number }

/** One line of a session's summary: an item, or a drill's cells or shapes, and how it went. */
export interface SummaryRow {
  key: string
  /** The item, or the first cell or shape of the drill, which names the line. */
  item: Item
  result: SummaryResult
  /** Whether the line reads as gone well: played or rated, right, or at least half right. */
  good: boolean
}

const RATING_ORDER: TakeRating[] = ['struggled', 'almost', 'clean']

/** The fastest take at effective speed, and at that speed the best it went. */
function fastestTake(takes: RatedTake[]): RatedTake {
  return takes.reduce((best, take) => {
    if (speedOf(take) !== speedOf(best)) return speedOf(take) > speedOf(best) ? take : best
    return RATING_ORDER.indexOf(take.rating) > RATING_ORDER.indexOf(best.rating) ? take : best
  })
}

/**
 * The lines of a session's summary, in the plan's order and grouped as the plan groups them, from
 * what became of each item by its place in the plan. Only what the student answered or played is
 * listed: an item never reached, or skipped, has no result.
 */
export function summaryRows(items: Item[], outcomes: ReadonlyMap<number, ItemOutcome>): SummaryRow[] {
  const rows: SummaryRow[] = []
  for (const row of planRows(items)) {
    const grouped = row.cellCount !== undefined || row.shapeCount !== undefined
    const answered = row.positions.map((position) => outcomes.get(position)).filter((outcome) => outcome !== undefined)
    if (answered.length === 0) continue

    if (grouped) {
      const right = answered.filter((outcome) => outcome.kind === 'answered' && outcome.correct).length
      rows.push({ key: row.key, item: row.item, result: { kind: 'counted', right, answered: answered.length }, good: right * 2 >= answered.length })
      continue
    }
    const outcome = answered[0]
    if (outcome.kind === 'played') {
      const take = fastestTake(outcome.takes)
      const result = { kind: 'played' as const, fastestBpm: take.bpm, fastestNoteValue: take.noteValue ?? 'quarters', rating: take.rating }
      rows.push({ key: row.key, item: row.item, result, good: true })
    } else if (outcome.kind === 'tapped') {
      rows.push({ key: row.key, item: row.item, result: { kind: 'tapped', hits: outcome.hits, bars: outcome.bars }, good: true })
    } else if (outcome.kind === 'toured') {
      rows.push({ key: row.key, item: row.item, result: { kind: 'toured', cleanKeys: outcome.cleanKeys, tourBpm: outcome.tourBpm }, good: true })
    } else if (outcome.kind === 'rated' || outcome.kind === 'changes') {
      rows.push({ key: row.key, item: row.item, result: outcome, good: true })
    } else {
      rows.push({ key: row.key, item: row.item, result: { kind: 'answered', correct: outcome.correct }, good: outcome.correct })
    }
  }
  return rows
}
