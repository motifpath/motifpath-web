import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as EventComponents } from '@/api/generated/event-ingestion'
import { ladderFloor, nextTempo } from '@/features/student/utils/tempoLadder'
import type { RatedTake, TakeRating } from '@/features/student/utils/tempoLadder'
import { useEventTracking } from '@/shared/composables/useEventTracking'
import { measureExerciseAudio } from '@/shared/utils/exerciseAudio'
import { isExactMatch } from '@/shared/utils/exerciseOptions'
import { gradeFretboardCell } from '@/shared/utils/fretboardCell'
import type { CellAnswer } from '@/shared/utils/fretboardCell'
import { MAX_TEMPO_BPM } from '@/shared/utils/sequence'

type Plan = components['schemas']['PracticeSessionPlan']
type Item = components['schemas']['PracticeSessionItem']
type FeltRating = EventComponents['schemas']['FeltRating']

/** Takes of a play-along, as core estimates the session's time with them. */
const FOCUS_TAKES = 4
const WARM_UP_TAKES = 2

/** Takes of an item; only a play-along is played in takes. */
function takesOf(item: Item) {
  if (item.kind !== 'play_along') return 0
  return item.reason === 'warm_up' ? WARM_UP_TAKES : FOCUS_TAKES
}

export interface ExerciseAnswer {
  optionIds: string[]
  correct: boolean
}

export interface GradedCellAnswer {
  answer: CellAnswer
  correct: boolean
}

/** A completed tap check: the median time from a fret lighting up to its tap, over how many taps. */
export interface TapCheckResult {
  medianMs: number
  count: number
}

/** The timed drill an item practises, as felt questions name it; none for a play-along. */
function drillTemplateOf(item: Item): string | null {
  if (item.fretboard_cell) return `fretboard_cell:${item.fretboard_cell.drill}`
  if (item.exercise) return `exercise:${item.exercise.exercise_type}`
  return null
}

export interface PracticeSessionRunOptions {
  /** The open-string pitches of a fretboard cell's instrument, lowest first; a cell is graded with them. */
  tuningOf?: (instrumentId: string) => string[] | undefined
}

/**
 * Runs one composed practice session of exercises and play-alongs: which item
 * is on, at what tempo a play-along's next take plays, and how many takes it
 * has left, with the practice.* events the run produces.
 *
 * An exercise is answered once: the options chosen are sent with the time
 * since it was shown, and the audio it asks the student to hear when it has
 * any; the run says whether the answer was right and stays on the exercise
 * until the student moves on.
 *
 * A focus item's tempo follows the tempo ladder from its start tempo; a
 * warm-up plays its takes at its own tempo, outside the ladder. The student may
 * pick another tempo for the next take, past the target too. A warm-up's takes
 * are never sent as practice.item_answered, since they are not evidence. An
 * item moves on after its last take, or when the student moves on; the
 * session ends after the last item, or when the student ends it. Nothing is
 * sent before start() or after the end.
 *
 * A fretboard cell is answered once, the way its drill asks: naming the note of
 * the cell shown, or tapping where the note asked is on its string. It's timed
 * and graded like an exercise.
 *
 * When the plan asks for a tap check, it comes before the first item: the first
 * item is shown, and timed, once the tap check is completed or skipped. After
 * the last item, the plan's felt questions about the drills the student actually
 * practised are asked, and the session ends once each has a rating or the
 * student skips them; a session left early asks none.
 */
export function usePracticeSessionRun(plan: Plan, options: PracticeSessionRunOptions = {}) {
  const { track } = useEventTracking()

  const index = ref(0)
  const takes = ref<RatedTake[]>([])
  /** A tempo the student chose for the next take, over the ladder's; forgotten once it's rated. */
  const chosenTempo = ref<number | null>(null)
  const started = ref(false)
  const finished = ref(false)
  const answeredItems = ref(new Set<string>())
  /** How many items the student answered or rated a take of; a warm-up never counts. */
  const answeredCount = computed(() => answeredItems.value.size)

  const tapCheckPending = ref(plan.tap_check_due)
  /** After the last item, while the felt questions are asked. */
  const askingFelt = ref(false)
  const practisedTemplates = ref(new Set<string>())
  const feltRatings = ref<FeltRating[]>([])

  /** The plan's felt questions about drills the student practised, in the plan's order. */
  const feltQuestions = computed(() => plan.felt_questions.filter((template) => practisedTemplates.value.has(template)))

  const current = computed<Item | null>(() =>
    finished.value || askingFelt.value || tapCheckPending.value ? null : (plan.items[index.value] ?? null),
  )

  /** The answer to the exercise on, once given. */
  const exerciseAnswer = ref<ExerciseAnswer | null>(null)
  /** The answer to the fretboard cell on, once given. */
  const cellAnswer = ref<GradedCellAnswer | null>(null)
  /** When the item on was shown, which an exercise's latency counts from. */
  let shownAt = 0

  // Measured up front, so each length is known by the time its exercise is answered.
  const audioMs = new Map<string, number>()
  for (const item of plan.items) {
    const exercise = item.exercise
    if (item.kind !== 'exercise' || !exercise) continue
    void measureExerciseAudio(exercise).then((ms) => {
      if (ms !== undefined) audioMs.set(exercise.exercise_id, ms)
    })
  }

  const tempo = computed(() => {
    const playAlong = current.value?.play_along
    if (!playAlong) return null
    if (chosenTempo.value !== null) return chosenTempo.value
    // A warm-up stays at the tempo of its last take, outside the ladder.
    if (current.value!.reason === 'warm_up') return takes.value.at(-1)?.bpm ?? playAlong.start_tempo_bpm
    return nextTempo({ start: playAlong.start_tempo_bpm, target: playAlong.target_tempo_bpm }, takes.value)
  })

  /** Plays the next take at a tempo of the student's choosing, from the ladder's floor up to the fastest playable. */
  function setTempo(bpm: number) {
    const playAlong = current.value?.play_along
    if (!playAlong) return
    chosenTempo.value = Math.min(MAX_TEMPO_BPM, Math.max(ladderFloor(playAlong.target_tempo_bpm), Math.round(bpm)))
  }

  const takesTotal = computed(() => (current.value ? takesOf(current.value) : 0))
  const takesLeft = computed(() => takesTotal.value - takes.value.length)

  /**
   * How much of each item is done, from 0 to 1: the items moved past in full, the current
   * play-along by its takes, the current exercise once answered.
   */
  const progress = computed(() =>
    plan.items.map((item, i) => {
      if (i < index.value) return 1
      if (i > index.value) return 0
      if (item.kind === 'exercise') return exerciseAnswer.value ? 1 : 0
      if (item.kind === 'fretboard_cell') return cellAnswer.value ? 1 : 0
      const total = takesOf(item)
      return total === 0 ? 0 : takes.value.length / total
    }),
  )

  const active = () => started.value && !finished.value && !askingFelt.value

  function start() {
    if (started.value) return
    started.value = true
    shownAt = Date.now()
    void track({
      event_type: 'practice.session_started',
      practice_session_id: plan.practice_session_id,
      ...(plan.instrument_id ? { instrument_id: plan.instrument_id } : {}),
      minutes: plan.minutes,
      planned_items: plan.items.map((item) => ({ item_key: item.item_key, reason: item.reason })),
    })
  }

  function finish(leftEarly: boolean, options: { keepalive?: boolean } = {}) {
    finished.value = true
    askingFelt.value = false
    void track(
      {
        event_type: 'practice.session_ended',
        practice_session_id: plan.practice_session_id,
        answered_count: answeredCount.value,
        left_early: leftEarly,
        felt_ratings: feltRatings.value,
      },
      options,
    )
  }

  /** Moves to the next item, or finishes the session after the last one. */
  function nextItem() {
    if (!active() || tapCheckPending.value) return
    takes.value = []
    chosenTempo.value = null
    exerciseAnswer.value = null
    cellAnswer.value = null
    shownAt = Date.now()
    index.value++
    if (index.value < plan.items.length) return
    if (feltQuestions.value.length > 0) askingFelt.value = true
    else finish(false)
  }

  /** Counts the item on as answered, and its drill as practised. */
  function markAnswered(item: Item) {
    answeredItems.value = new Set(answeredItems.value).add(item.item_key)
    const template = drillTemplateOf(item)
    if (template) practisedTemplates.value = new Set(practisedTemplates.value).add(template)
  }

  /** Sends a completed tap check, then shows the first item. */
  function completeTapCheck(result: TapCheckResult) {
    if (!active() || !tapCheckPending.value) return
    void track({ event_type: 'practice.tap_check_completed', median_tap_ms: Math.round(result.medianMs), tap_count: result.count })
    skipTapCheck()
  }

  /** Goes on to the first item without a tap check; answers are then judged on their whole time. */
  function skipTapCheck() {
    if (!active() || !tapCheckPending.value) return
    tapCheckPending.value = false
    shownAt = Date.now()
  }

  /** Records how a drill asked about felt; the session ends once every question has a rating. */
  function rateFelt(template: string, felt: FeltRating['felt']) {
    if (!askingFelt.value || !feltQuestions.value.includes(template)) return
    feltRatings.value = [...feltRatings.value.filter((rating) => rating.drill_template_key !== template), { drill_template_key: template, felt }]
    if (feltRatings.value.length === feltQuestions.value.length) finish(false)
  }

  /** Ends the session with the felt ratings given so far. */
  function skipFelt() {
    if (askingFelt.value) finish(false)
  }

  /** Records the student's rating of the take just played at the current tempo. */
  function rate(rating: TakeRating) {
    const item = current.value
    const bpm = tempo.value
    if (!active() || !item || bpm === null) return

    if (item.reason !== 'warm_up') {
      markAnswered(item)
      void track({
        event_type: 'practice.item_answered',
        practice_session_id: plan.practice_session_id,
        item_key: item.item_key,
        response: { response_type: 'self_rating', rating, tempo_bpm: bpm },
      })
    }
    takes.value = [...takes.value, { bpm, rating }]
    chosenTempo.value = null
    if (takesLeft.value <= 0) nextItem()
  }

  /** Answers the exercise on with the options chosen; only the first answer counts. */
  function answer(optionIds: string[]) {
    const item = current.value
    const exercise = item?.exercise
    if (!active() || !item || item.kind !== 'exercise' || !exercise || exerciseAnswer.value || optionIds.length === 0) return

    exerciseAnswer.value = { optionIds, correct: isExactMatch(exercise.options, optionIds) }
    markAnswered(item)
    const audio = audioMs.get(exercise.exercise_id)
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: {
        response_type: 'option_choice',
        option_ids: optionIds,
        latency_ms: Date.now() - shownAt,
        ...(audio !== undefined ? { audio_ms: audio } : {}),
      },
    })
  }

  /** Answers the fretboard cell on, the way its drill asks; only the first answer counts. */
  function answerCell(answer: CellAnswer) {
    const item = current.value
    const cell = item?.fretboard_cell
    if (!active() || !item || !cell || cellAnswer.value || answer.response_type !== cell.drill) return
    const tuning = options.tuningOf?.(cell.layout_instrument_id)
    const correct = tuning ? gradeFretboardCell(tuning, cell, answer) : null
    if (correct === null) return

    cellAnswer.value = { answer, correct }
    markAnswered(item)
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: { ...answer, latency_ms: Date.now() - shownAt },
    })
  }

  /**
   * Ends the session now; `keepalive` when the page is closing. Before the last item it ends as
   * left early; during the felt questions, as finished with the ratings given so far.
   */
  function end(options: { keepalive?: boolean } = {}) {
    if (askingFelt.value) finish(false, options)
    else if (active()) finish(true, options)
  }

  return {
    plan,
    index,
    current,
    tempo,
    takesTotal,
    takesLeft,
    progress,
    answeredCount,
    exerciseAnswer,
    cellAnswer,
    tapCheckPending,
    askingFelt,
    feltQuestions,
    feltRatings,
    finished,
    start,
    setTempo,
    rate,
    answer,
    answerCell,
    completeTapCheck,
    skipTapCheck,
    rateFelt,
    skipFelt,
    nextItem,
    end,
  }
}
