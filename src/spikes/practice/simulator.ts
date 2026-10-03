/**
 * Synthetic practice histories for four kinds of student, used to check that
 * the derived states tell each story correctly. The student's "true" ability is
 * a curve over the days; answers and self-ratings are drawn from it.
 */
import { AM_C_CHANGES, ALTERNATE_PICKING, BLUES_LICK, STUDENT_ID, TEACHER_ID } from '@/spikes/practice/fixtures/catalog'
import type { Evidence, PlayAlongItem, PracticeItem, Rating, TeacherNote } from '@/spikes/practice/model'
import { seededRandom } from '@/spikes/practice/random'
import type { Random } from '@/spikes/practice/random'
import { nextBpm, startingBpm } from '@/spikes/practice/tempoLadder'
import type { Take } from '@/spikes/practice/tempoLadder'

export type Archetype = 'improving' | 'plateau' | 'decaying' | 'overconfident'

export const ARCHETYPES: Record<Archetype, string> = {
  improving: 'Improving — practises daily and gets faster',
  plateau: 'Plateau — practises daily, stuck at the same level',
  decaying: 'Decaying — strong start, stops after ten days',
  overconfident: 'Overconfident — rates takes higher than they are',
}

const DAY_MS = 86_400_000
const TAKES_PER_SESSION = 4

interface Ability {
  /** Chance a fretboard or exercise answer is right. */
  correct: number
  latencyMs: number
  /** Fastest truly clean tempo on the picking drill. */
  bpm: number
  changesPerMinute: number
  /** How many BPM the student flatters their own takes by. */
  selfBias: number
  practises: boolean
}

function ability(archetype: Archetype, day: number, reviewed: boolean): Ability {
  const p = Math.min(1, day / 12)
  switch (archetype) {
    case 'improving':
      return { correct: 0.6 + 0.37 * p, latencyMs: 5000 - 3800 * p, bpm: 70 + 45 * Math.min(1, day / 18), changesPerMinute: 20 + 30 * p, selfBias: 0, practises: true }
    case 'plateau':
      return { correct: 0.7, latencyMs: 3500, bpm: 82, changesPerMinute: 25, selfBias: 0, practises: true }
    case 'decaying':
      return { correct: 0.6 + 0.37 * p, latencyMs: 5000 - 3800 * p, bpm: 70 + 45 * Math.min(1, day / 18), changesPerMinute: 20 + 30 * p, selfBias: 0, practises: day < 10 }
    case 'overconfident':
      return { correct: 0.6 + 0.3 * p, latencyMs: 5000 - 3000 * p, bpm: 70 + 25 * Math.min(1, day / 18), changesPerMinute: 20 + 20 * p, selfBias: reviewed ? 0 : 20, practises: true }
  }
}

function rate(bpm: number, trueBpm: number): Rating {
  if (bpm <= trueBpm) return 'clean'
  if (bpm <= trueBpm + 5) return 'almost'
  return 'struggled'
}

export interface SimulateOptions {
  items: PracticeItem[]
  start: Date
  days: number
  seed: number
}

export interface Simulation {
  evidence: Evidence[]
  notes: TeacherNote[]
}

export function simulate(archetype: Archetype, options: SimulateOptions): Simulation {
  const random: Random = seededRandom(options.seed)
  const evidence: Evidence[] = []
  const notes: TeacherNote[] = []
  let n = 0
  const id = () => `${archetype}-e${n++}`
  const at = (day: number, seconds: number) =>
    new Date(options.start.getTime() + day * DAY_MS + 10 * 3_600_000 + seconds * 1000).toISOString()

  const cells = options.items.filter((i) => i.kind === 'fretboard_cell' && (i.string === 6 || i.string === 5))
  const exercises = options.items.filter((i) => i.kind === 'exercise')
  const drill = options.items.find((i): i is PlayAlongItem => i.item_key === ALTERNATE_PICKING)
  let bestClean: number | null = null
  let reviewed = false
  const reviewDay = options.days - 2

  for (let day = 0; day < options.days; day++) {
    const a = ability(archetype, day, reviewed)
    if (!a.practises) continue
    const session_id = `${archetype}-session-${day}`
    let second = 0

    for (const item of [...cells, ...exercises]) {
      const correct = random() < a.correct
      const latency = Math.round(a.latencyMs * (0.8 + 0.4 * random()))
      evidence.push({ evidence_id: id(), student_id: STUDENT_ID, item_key: item.item_key, occurred_at: at(day, second), session_id, source: 'auto_graded', correct, latency_ms: latency })
      second += 10
    }

    if (drill && day % 2 === 0) {
      const takes: Take[] = []
      let bpm = startingBpm(drill.params, bestClean)
      for (let t = 0; t < TAKES_PER_SESSION; t++) {
        const rating = rate(bpm, a.bpm + a.selfBias)
        takes.push({ bpm, rating })
        if (rating === 'clean') bestClean = Math.max(bestClean ?? 0, bpm)
        evidence.push({ evidence_id: id(), student_id: STUDENT_ID, item_key: drill.item_key, occurred_at: at(day, second), session_id, source: 'self_assessed', rating, bpm, changes_per_minute: null })
        second += 120
        bpm = nextBpm(drill.params, takes, bpm)
      }
    }

    if (day % 3 === 0) {
      const cpm = Math.round(a.changesPerMinute + (archetype === 'overconfident' && !reviewed ? 12 : 0))
      evidence.push({ evidence_id: id(), student_id: STUDENT_ID, item_key: AM_C_CHANGES, occurred_at: at(day, second), session_id, source: 'self_assessed', rating: 'clean', bpm: null, changes_per_minute: cpm })
    }

    if (archetype === 'overconfident' && day === reviewDay && drill) {
      const claimed = bestClean ?? drill.params.start_bpm
      const note: TeacherNote = {
        teacher_note_id: `${archetype}-note-1`,
        student_id: STUDENT_ID,
        teacher_id: TEACHER_ID,
        created_at: at(day, second + 3600),
        take_id: `${archetype}-take-1`,
        item_key: drill.item_key,
        rating: 'almost',
        bpm: claimed,
        verified: false,
        rubric: { timing: 2, clean_notes: 3, tension: 2, dynamics: 3 },
        comments: [
          { at_seconds: 4, text: 'Rushing on the way down — the eighths are uneven.' },
          { at_seconds: 11, text: 'Picking hand tenses up; the pick digs in too deep.' },
        ],
        summary: `Feels clean to you at ${claimed}, but it's clean around ${Math.round(a.bpm)}. Drop the tempo and keep it relaxed.`,
        needs_work: { skill_ids: ['alternate-picking'], concept_ids: [] },
        suggested_item_keys: [ALTERNATE_PICKING, BLUES_LICK],
        target_level: 'accurate',
        closed_at: null,
      }
      notes.push(note)
      evidence.push({ evidence_id: id(), student_id: STUDENT_ID, item_key: drill.item_key, occurred_at: note.created_at, session_id: null, source: 'teacher_reviewed', teacher_note_id: note.teacher_note_id, rating: 'almost', bpm: claimed, changes_per_minute: null, verified: false })
      reviewed = true
      bestClean = null
    }
  }
  return { evidence, notes }
}
