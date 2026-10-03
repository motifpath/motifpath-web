/**
 * The spike's whole state: a simulated history for the chosen archetype, plus
 * whatever is done live in the prototype, with every screen derived from it.
 * Live additions persist in this browser; the simulated part is recomputed.
 */
import { computed, reactive, watch } from 'vue'

import { gradeContext, items, pathSkillIds, STUDENT_ID } from '@/spikes/practice/fixtures/catalog'
import { graph, GUITAR_ID } from '@/spikes/practice/fixtures/graph'
import { ingestAnswer } from '@/spikes/practice/ingest'
import { deriveStates } from '@/spikes/practice/mastery'
import type {
  Evidence,
  KnowledgeState,
  PracticeResponse,
  RecordedTake,
  Session,
  TeacherNote,
} from '@/spikes/practice/model'
import { composeSession } from '@/spikes/practice/sessionComposer'
import { simulate } from '@/spikes/practice/simulator'
import { summarize } from '@/spikes/practice/summary'
import { openSuggestions } from '@/spikes/practice/teacherNotes'
import type { OpenSuggestions } from '@/spikes/practice/teacherNotes'
import type { Archetype } from '@/spikes/practice/simulator'

export const SIM_START = new Date('2026-10-01T09:00:00Z')
export const SIM_DAYS = 21
const DAY_MS = 86_400_000
const STORAGE_KEY = 'practice-spike-live-v2'

interface LiveData {
  evidence: Evidence[]
  notes: TeacherNote[]
  /** When the teacher closed a note, by note id. */
  closed: Record<string, string>
}

function loadLive(): LiveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Storage unavailable or corrupt: start empty.
  }
  return { evidence: [], notes: [], closed: {} }
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
    .map((n) => ({ ...n, closed_at: state.live.closed[n.teacher_note_id] ?? n.closed_at }))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
)

const states = computed(() => deriveStates(items, evidence.value, now.value))

function statesAt(t: Date): Map<string, KnowledgeState> {
  return deriveStates(
    items,
    evidence.value.filter((e) => before(e.occurred_at, t)),
    t,
  )
}

/** The home screen's one read: derived from the same evidence as everything else. */
const summary = computed(() =>
  summarize({
    graph,
    items,
    instrument_id: GUITAR_ID,
    now: now.value,
    states_now: states.value,
    states_week_ago: statesAt(new Date(now.value.getTime() - 7 * DAY_MS)),
    evidence: evidence.value,
  }),
)

/** What a note still steers: its suggestions not yet met, while it is open and recent. */
function openFor(note: TeacherNote): OpenSuggestions {
  return openSuggestions([note], { nodes: graph.nodes, items, states: states.value, now: now.value })
}

const activeNotes = computed(() =>
  notes.value.filter((n) => {
    const open = openFor(n)
    return open.item_keys.length + open.node_ids.length > 0
  }),
)

/**
 * A timestamp for something done live. Screens only see evidence up to "now", so live events
 * are stamped in the hour before it, one second apart, keeping the order they happened in.
 */
const LIVE_WINDOW_MS = 3_600_000
let liveSeq = state.live.evidence.length + state.live.notes.length
function clock(): string {
  return new Date(now.value.getTime() - LIVE_WINDOW_MS + (liveSeq++ % 3600) * 1000).toISOString()
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
    openFor,
    states,
    clock,
    newId,
    statesAt,
    summary,
    compose(instrumentInHand: boolean, minutes: number): Session {
      return composeSession({
        session_id: newId('session'),
        student_id: STUDENT_ID,
        now: now.value,
        items,
        states: states.value,
        graph,
        instrument_id: GUITAR_ID,
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
    /** Sends a raw response as a practice.item_answered event; the "server" grades it into evidence. */
    answer(itemKey: string, response: PracticeResponse, sessionId: string) {
      const result = ingestAnswer(
        {
          event_type: 'practice.item_answered',
          event_id: newId('ev'),
          student_id: STUDENT_ID,
          session_id: sessionId,
          occurred_at: clock(),
          item_key: itemKey,
          response,
        },
        items,
        gradeContext,
      )
      if (!('rejected' in result)) state.live.evidence.push(result)
      return result
    },
    addNote(note: TeacherNote, review: Evidence | null) {
      state.live.notes.push(note)
      if (review) state.live.evidence.push(review)
    },
    closeNote(id: string) {
      state.live.closed[id] = clock()
    },
    addTake(take: RecordedTake) {
      state.takes.push(take)
    },
    resetLive() {
      liveSeq = 0
      state.live = { evidence: [], notes: [], closed: {} }
      state.takes = []
    },
  }
}
