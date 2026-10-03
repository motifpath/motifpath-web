/**
 * Many simulated students on one timed drill, around a known true fluent time,
 * to check that calibration finds it. Each student has their own speed (some
 * faster than fluent, some slower, all improving), their own tap time (phone or
 * desktop), and rates how each session felt.
 *
 * Modelling assumption, to validate with real students: a timed drill starts to
 * feel hard once the student is slower than fluent, and easy well below it.
 */
import { cellItems, gradeContext } from '@/spikes/practice/fixtures/catalog'
import { ingestAnswer } from '@/spikes/practice/ingest'
import type { Evidence, Felt, FeltRating } from '@/spikes/practice/model'
import { seededRandom } from '@/spikes/practice/random'
import type { Random } from '@/spikes/practice/random'

export interface PopulationOptions {
  students: number
  sessions_per_student: number
  true_fluent_ms: number
  /** Share of students who rate every session one step easier than it was. */
  overconfident_share: number
  /** Chance a rating lands one step off, either way. */
  felt_noise: number
  /** Share of students answering on a phone (slower taps). */
  phone_share?: number
  seed: number
}

export interface Population {
  evidence: Evidence[]
  felt: FeltRating[]
  /** Each student's tap time, as a tap check would measure it. */
  tap_ms: Map<string, number>
}

export const TEMPLATE = 'fretboard_cell:name_the_note'
const ANSWERS_PER_SESSION = 12
const DAY_MS = 86_400_000
const START = Date.parse('2026-10-01T10:00:00Z')
const FELT: Felt[] = ['easy', 'about_right', 'hard']

function normal(random: Random): number {
  const u = Math.max(1e-9, random())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

/** How a session felt, from how its knowing time compares with fluent. */
function feltFor(ratio: number): Felt {
  if (ratio > 1) return 'hard'
  return ratio < 0.7 ? 'easy' : 'about_right'
}

function shift(felt: Felt, by: number): Felt {
  const i = Math.min(2, Math.max(0, FELT.indexOf(felt) + by))
  return FELT[i]!
}

export function simulatePopulation(options: PopulationOptions): Population {
  const random = seededRandom(options.seed)
  const cells = cellItems.filter((c) => c.string === 6)
  const evidence: Evidence[] = []
  const felt: FeltRating[] = []
  const tap_ms = new Map<string, number>()
  let n = 0

  for (let s = 0; s < options.students; s++) {
    const student = `student-${s}`
    const phone = random() < (options.phone_share ?? 0.3)
    const tap = Math.round((phone ? 700 : 300) * Math.exp(0.15 * normal(random)))
    tap_ms.set(student, tap)
    // Starting knowing time: spread from well below fluent to well above it.
    const start = options.true_fluent_ms * Math.exp(0.35 + 0.5 * normal(random))
    const overconfident = random() < options.overconfident_share

    for (let d = 0; d < options.sessions_per_student; d++) {
      const knowing = start * Math.pow(0.9, d)
      const session_id = `${student}-session-${d}`
      const times: number[] = []
      for (let a = 0; a < ANSWERS_PER_SESSION; a++) {
        const item = cells[(s + d * 5 + a) % cells.length]!
        const net = knowing * Math.exp(0.25 * normal(random))
        const correct = random() < (knowing <= options.true_fluent_ms ? 0.95 : 0.75)
        if (correct) times.push(net)
        const latency_ms = Math.round(tap + net)
        const occurred_at = new Date(START + d * DAY_MS + s * 1000 + a * 10).toISOString()
        const result = ingestAnswer(
          {
            event_type: 'practice.item_answered',
            event_id: `p${n++}`,
            student_id: student,
            session_id,
            occurred_at,
            item_key: item.item_key,
            response: {
              kind: 'name_the_note',
              chosen_note: correct ? item.note_name : 'X#',
              latency_ms,
            },
          },
          cells,
          gradeContext,
          tap,
        )
        if (!('rejected' in result)) evidence.push(result)
      }
      let rating = feltFor(knowing / options.true_fluent_ms)
      if (random() < options.felt_noise) rating = shift(rating, random() < 0.5 ? -1 : 1)
      if (overconfident) rating = shift(rating, -1)
      felt.push({
        student_id: student,
        session_id,
        template: TEMPLATE,
        felt: rating,
        occurred_at: new Date(START + d * DAY_MS + s * 1000 + 999).toISOString(),
      })
    }
  }
  return { evidence, felt, tap_ms }
}
