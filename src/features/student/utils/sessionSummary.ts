import type { components } from '@/api/generated/core-domain'
import type { ItemOutcome } from '@/features/student/composables/usePracticeSessionRun'
import { planRowKeyOf, planRows } from '@/features/student/utils/planRows'
import type { RatedTake, TakeRating } from '@/features/student/utils/tempoLadder'

type Item = components['schemas']['PracticeSessionItem']

/** How a line of the summary went. */
export type SummaryResult =
  /** A play-along: the fastest tempo it was played at, and how that take went. */
  | { kind: 'played'; fastestBpm: number; rating: TakeRating }
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
  /** Whether the line reads as gone well: played, right, or at least half right. */
  good: boolean
}

const RATING_ORDER: TakeRating[] = ['struggled', 'almost', 'clean']

/** The fastest take, and at that tempo the best it went. */
function fastestTake(takes: RatedTake[]): RatedTake {
  return takes.reduce((best, take) => {
    if (take.bpm !== best.bpm) return take.bpm > best.bpm ? take : best
    return RATING_ORDER.indexOf(take.rating) > RATING_ORDER.indexOf(best.rating) ? take : best
  })
}

/**
 * The lines of a session's summary, in the plan's order and grouped as the plan groups them. Only
 * what the student answered or played is listed: an item never reached, or skipped, has no result.
 */
export function summaryRows(items: Item[], outcomes: ReadonlyMap<string, ItemOutcome>): SummaryRow[] {
  const rows: SummaryRow[] = []
  for (const row of planRows(items)) {
    const grouped = row.cellCount !== undefined || row.shapeCount !== undefined
    const answered = items
      .filter((item) => planRowKeyOf(item) === row.key)
      .map((item) => outcomes.get(item.item_key))
      .filter((outcome) => outcome !== undefined)
    if (answered.length === 0) continue

    if (grouped) {
      const right = answered.filter((outcome) => outcome.kind === 'answered' && outcome.correct).length
      rows.push({ key: row.key, item: row.item, result: { kind: 'counted', right, answered: answered.length }, good: right * 2 >= answered.length })
      continue
    }
    const outcome = answered[0]
    if (outcome.kind === 'played') {
      const take = fastestTake(outcome.takes)
      rows.push({ key: row.key, item: row.item, result: { kind: 'played', fastestBpm: take.bpm, rating: take.rating }, good: true })
    } else {
      rows.push({ key: row.key, item: row.item, result: { kind: 'answered', correct: outcome.correct }, good: outcome.correct })
    }
  }
  return rows
}
