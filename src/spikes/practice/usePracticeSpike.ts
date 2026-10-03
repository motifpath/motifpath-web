/**
 * The spike's whole state: a simulated history for the chosen archetype, plus
 * whatever is done live in the prototype, with every screen derived from it.
 * Live additions persist in this browser; the simulated part is recomputed.
 */
import { computed, reactive, watch } from 'vue'

import {
  benchmarkBook,
  enrolments,
  gradeContext,
  items,
  pathSkillIds,
  STUDENT_ID,
} from '@/spikes/practice/fixtures/catalog'
import { graph } from '@/spikes/practice/fixtures/graph'
import { studentInstruments } from '@/spikes/practice/instruments'
import { ingestAnswer } from '@/spikes/practice/ingest'
import { deriveStates } from '@/spikes/practice/mastery'
import type {
  Evidence,
  Felt,
  FeltRating,
  KnowledgeState,
  PracticeResponse,
  RecordedTake,
  Session,
  TeacherNote,
} from '@/spikes/practice/model'
import { composeSession } from '@/spikes/practice/sessionComposer'
import { simulate } from '@/spikes/practice/simulator'
import { summarize } from '@/spikes/practice/summary'
import { simulatePopulation } from '@/spikes/practice/populationSimulator'
import {
  activeThreshold,
  calibrate,
  sessionObservations,
  tapBaseline,
} from '@/spikes/practice/thresholds'
import type { Threshold } from '@/spikes/practice/thresholds'
import { openSuggestions } from '@/spikes/practice/teacherNotes'
import type { OpenSuggestions } from '@/spikes/practice/teacherNotes'
import type { Archetype } from '@/spikes/practice/simulator'

export const SIM_START = new Date('2026-10-01T09:00:00Z')
export const SIM_DAYS = 21
const DAY_MS = 86_400_000
const STORAGE_KEY = 'practice-spike-live-v4'

interface LiveData {
  evidence: Evidence[]
  notes: TeacherNote[]
  /** When the teacher closed a note, by note id. */
  closed: Record<string, string>
  /** The student's tap time from the tap check; null until done. */
  tap_ms: number | null
  felt: FeltRating[]
  /** Threshold versions calibrated in this browser, on top of the benchmark. */
  thresholds: Threshold[]
  /** Instruments the student added in their profile, beyond their enrolments. */
  profile_instrument_ids: string[]
}

const emptyLive = (): LiveData => ({
  evidence: [],
  notes: [],
  closed: {},
  tap_ms: null,
  felt: [],
  thresholds: [],
  profile_instrument_ids: [],
})

function loadLive(): LiveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Storage unavailable or corrupt: start empty.
  }
  return emptyLive()
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

const simulation = computed(() =>
  simulate(state.archetype, { items, start: SIM_START, days: SIM_DAYS, seed: 1 }),
)
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

const book = computed(() => [...benchmarkBook, ...state.live.thresholds])
const felt = computed(() => state.live.felt)

const states = computed(() => deriveStates(items, evidence.value, now.value, book.value))

function statesAt(t: Date): Map<string, KnowledgeState> {
  return deriveStates(
    items,
    evidence.value.filter((e) => before(e.occurred_at, t)),
    t,
    book.value,
  )
}

const instrumentIds = computed(() =>
  studentInstruments({ enrolments, profile_instrument_ids: state.live.profile_instrument_ids }),
)

const statesWeekAgo = computed(() => statesAt(new Date(now.value.getTime() - 7 * DAY_MS)))

/** The home screen's one read for an instrument: derived from the same evidence as everything else. */
function summaryFor(instrumentId: string) {
  return summarize({
    graph,
    items,
    instrument_id: instrumentId,
    now: now.value,
    states_now: states.value,
    states_week_ago: statesWeekAgo.value,
    evidence: evidence.value,
  })
}

/** What a note still steers: its suggestions not yet met, while it is open and recent. */
function openFor(note: TeacherNote): OpenSuggestions {
  return openSuggestions([note], {
    nodes: graph.nodes,
    items,
    states: states.value,
    now: now.value,
  })
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
    summaryFor,
    instrumentIds,
    book,
    felt,
    compose(instrumentInHand: string | null, minutes: number): Session {
      return composeSession({
        session_id: newId('session'),
        student_id: STUDENT_ID,
        now: now.value,
        items,
        states: states.value,
        graph,
        instrument_ids: instrumentIds.value,
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
        state.live.tap_ms ?? 0,
      )
      if (!('rejected' in result)) state.live.evidence.push(result)
      return result
    },
    addNote(note: TeacherNote, review: Evidence | null) {
      state.live.notes.push(note)
      if (review) state.live.evidence.push(review)
    },
    /** Saves the tap check's result; returns the baseline, or null with too few taps. */
    saveTapCheck(latencies: number[]): number | null {
      const baseline = tapBaseline(latencies)
      if (baseline !== null) state.live.tap_ms = baseline
      return baseline
    },
    /** How a timed drill felt in a session; a second answer replaces the first. */
    rateFelt(sessionId: string, template: string, value: Felt) {
      state.live.felt = state.live.felt.filter(
        (f) => !(f.session_id === sessionId && f.template === template),
      )
      state.live.felt.push({
        student_id: STUDENT_ID,
        session_id: sessionId,
        template,
        felt: value,
        occurred_at: clock(),
      })
    },
    /**
     * Recalibrates a template from a simulated population whose true fluent time is
     * `trueFluentMs`, plus this student's own felt-rated sessions; in force from now.
     */
    recalibrate(template: string, trueFluentMs: number): Threshold {
      const at = clock()
      const prior = activeThreshold(book.value, template, at)!
      const population = simulatePopulation({
        students: 40,
        sessions_per_student: 8,
        true_fluent_ms: trueFluentMs,
        overconfident_share: 0.2,
        felt_noise: 0.15,
        seed: 11,
      })
      const observations = [
        ...sessionObservations(population.evidence, population.felt, template),
        ...sessionObservations(evidence.value, state.live.felt, template),
      ]
      const next = calibrate(prior, observations, at)
      if (next !== prior) state.live.thresholds.push(next)
      return next
    },
    toggleProfileInstrument(id: string) {
      const list = state.live.profile_instrument_ids
      state.live.profile_instrument_ids = list.includes(id)
        ? list.filter((x) => x !== id)
        : [...list, id]
    },
    closeNote(id: string) {
      state.live.closed[id] = clock()
    },
    addTake(take: RecordedTake) {
      state.takes.push(take)
    },
    resetLive() {
      liveSeq = 0
      state.live = emptyLive()
      state.takes = []
    },
  }
}
