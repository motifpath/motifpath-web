/**
 * The spike's whole state: a simulated history for the chosen archetype, plus
 * whatever is done live in the prototype, with every screen derived from it.
 * Live additions persist in this browser; the simulated part is recomputed.
 */
import { computed, reactive, watch } from 'vue'

import { items, pathSkillIds, skills, STUDENT_ID } from '@/spikes/practice/fixtures/catalog'
import { deriveStates } from '@/spikes/practice/mastery'
import type { Evidence, KnowledgeState, RecordedTake, Session, TeacherNote } from '@/spikes/practice/model'
import { composeSession } from '@/spikes/practice/sessionComposer'
import { simulate } from '@/spikes/practice/simulator'
import type { Archetype } from '@/spikes/practice/simulator'

export const SIM_START = new Date('2026-10-01T09:00:00Z')
export const SIM_DAYS = 21
const DAY_MS = 86_400_000
/** A teacher's suggestions steer sessions for this long, then lapse. */
export const SUGGESTION_LIFETIME_DAYS = 14
const STORAGE_KEY = 'practice-spike-live-v1'

interface LiveData {
  evidence: Evidence[]
  notes: TeacherNote[]
}

function loadLive(): LiveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Storage unavailable or corrupt: start empty.
  }
  return { evidence: [], notes: [] }
}

const state = reactive({
  archetype: 'improving' as Archetype,
  day: SIM_DAYS,
  live: loadLive(),
  /** Recorded takes hold object URLs, which don't survive a reload. */
  takes: [] as RecordedTake[],
})

watch(
  () => state.live,
  (live) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(live))
    } catch {
      // Not persisting is fine for a spike.
    }
  },
  { deep: true },
)

const pageLoadedAt = Date.now()
const simulation = computed(() => simulate(state.archetype, { items, start: SIM_START, days: SIM_DAYS, seed: 1 }))
const now = computed(() => new Date(SIM_START.getTime() + state.day * DAY_MS))
const before = (iso: string, t: Date) => Date.parse(iso) <= t.getTime()

const evidence = computed(() => [
  ...simulation.value.evidence.filter((e) => before(e.occurred_at, now.value)),
  ...state.live.evidence.filter((e) => before(e.occurred_at, now.value)),
])

const notes = computed(() =>
  [...simulation.value.notes, ...state.live.notes]
    .filter((n) => before(n.created_at, now.value))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
)

const activeNotes = computed(() =>
  notes.value.filter((n) => now.value.getTime() - Date.parse(n.created_at) <= SUGGESTION_LIFETIME_DAYS * DAY_MS),
)

const states = computed(() => deriveStates(items, evidence.value, now.value))

/** The simulated "now" plus real seconds since the page loaded, so live events keep their order. */
function clock(): string {
  return new Date(now.value.getTime() + (Date.now() - pageLoadedAt)).toISOString()
}

let counter = 0
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${counter++}`
}

export function usePracticeSpike() {
  return {
    state,
    now,
    evidence,
    notes,
    activeNotes,
    states,
    clock,
    newId,
    statesAt(t: Date): Map<string, KnowledgeState> {
      return deriveStates(
        items,
        evidence.value.filter((e) => before(e.occurred_at, t)),
        t,
      )
    },
    compose(instrumentInHand: boolean, minutes: number): Session {
      return composeSession({
        session_id: newId('session'),
        student_id: STUDENT_ID,
        now: now.value,
        items,
        states: states.value,
        taxonomy: skills,
        path_skill_ids: pathSkillIds,
        teacher_notes: activeNotes.value,
        instrument_in_hand: instrumentInHand,
        minutes,
        seed: Date.now() % 100_000,
      })
    },
    addEvidence(e: Evidence) {
      state.live.evidence.push(e)
    },
    addNote(note: TeacherNote, review: Evidence | null) {
      state.live.notes.push(note)
      if (review) state.live.evidence.push(review)
    },
    addTake(take: RecordedTake) {
      state.takes.push(take)
    },
    resetLive() {
      state.live = { evidence: [], notes: [] }
      state.takes = []
    },
  }
}
