import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as EventComponents } from '@/api/generated/event-ingestion'
import { changeMinuteRating } from '@/features/student/utils/changeMinute'
import { afterTake, tourStart, tourTempoIn } from '@/features/student/utils/keyTour'
import type { TourState } from '@/features/student/utils/keyTour'
import { ladderFloorIn, nextTempo, speedOf } from '@/features/student/utils/tempoLadder'
import type { PlayedTempo, RatedTake, TakeRating } from '@/features/student/utils/tempoLadder'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useEventTracking } from '@/shared/composables/useEventTracking'
import { measureExerciseAudio } from '@/shared/utils/exerciseAudio'
import { isExactMatch } from '@/shared/utils/exerciseOptions'
import { gradeDiagramShape } from '@/shared/utils/diagramShape'
import type { ShapeAnswer, ShapeReference } from '@/shared/utils/diagramShape'
import { gradeFretboardCell } from '@/shared/utils/fretboardCell'
import type { CellAnswer } from '@/shared/utils/fretboardCell'
import { gradeGeneratedChoice, rightAnswerOf } from '@/shared/utils/generatedChoice'
import type { GeneratedQuestion, ProgressionCatalog } from '@/shared/utils/generatedChoice'
import { MAX_TEMPO_BPM } from '@/shared/utils/sequence'
import { keepEffectiveSpeed, speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Plan = components['schemas']['PracticeSessionPlan']
type Item = components['schemas']['PracticeSessionItem']
type FeltRating = EventComponents['schemas']['FeltRating']
/** Why an item went unanswered: its sound or image didn't load, or it can't be shown here. */
export type NotAnsweredReason = EventComponents['schemas']['NotAnsweredResponse']['reason']

/** Takes of a play-along, as core estimates the session's time with them. */
const FOCUS_TAKES = 4
const WARM_UP_TAKES = 2

/** Takes of an item: a play-along's, or a progression key tour's as its plan gives them. */
function takesOf(item: Item) {
  if (item.progression_keys) return item.progression_keys.takes
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

export interface GradedShapeAnswer {
  answer: ShapeAnswer
  correct: boolean
}

/** A harmony question's answer, graded: the option picked, the right one, and whether they match. */
export interface GradedGeneratedAnswer {
  choice: string
  right: string
  correct: boolean
}

/**
 * A harmony question's answer as the question sends it: the way, the options as shown, the pick,
 * and for a question asked by ear how long its sound played the first time.
 */
export interface GeneratedChoiceAnswer {
  way: GeneratedQuestion['way']
  options: string[]
  choice: string
  audioMs?: number
}

/** The kinds whose question is asked in a key its item doesn't fix, so the answer names it. */
const KEYED_BY_THE_QUESTION: Item['kind'][] = ['chart_progression', 'heard_chord', 'heard_progression']

/** What grading a harmony answer needs: the question as the grader reads it, and the catalog for charts. */
export interface GeneratedChoiceGrading {
  question: GeneratedQuestion
  catalog: ProgressionCatalog
}

/** What a shape's loaded diagram tells about it: its positions, on an instrument of so many strings. */
export type ShapeBoard = Pick<ShapeReference, 'positions' | 'stringCount'>

/** A completed tap check: the median time from a fret lighting up to its tap, over how many taps. */
export interface TapCheckResult {
  medianMs: number
  count: number
}

/** The timed drill an item practises, as felt questions name it; none for a play-along. */
function drillTemplateOf(item: Item): string | null {
  if (item.fretboard_cell) return `fretboard_cell:${item.fretboard_cell.drill}`
  if (item.diagram_shape) return `diagram_shape:${item.diagram_shape.drill}`
  if (item.exercise) return `exercise:${item.exercise.exercise_type}`
  if (item.generated_choice) return `${item.kind}:${item.generated_choice.way}`
  return null
}

/**
 * What became of an item the student got to: answered, right or not, played take by take, a chord
 * rated, or a minute of changes counted.
 */
export type ItemOutcome =
  | { kind: 'answered'; correct: boolean }
  | { kind: 'played'; takes: RatedTake[] }
  | { kind: 'rated'; rating: TakeRating }
  | { kind: 'changes'; tempoBpm: number; cleanChanges: number; rating: TakeRating }
  /** A progression key tour: its takes, the keys clean when the last was rated, and the tour tempo in quarters. */
  | { kind: 'toured'; takes: RatedTake[]; cleanKeys: number; tourBpm: number }

/** A play-along just finished, handing over to the next item. */
export interface Handoff {
  done: Item
  /** The fastest tempo the finished play-along was played at, by effective speed, as played. */
  fastestBpm: number
  fastestNoteValue: TempoNoteValue
  next: Item
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
 * pick another tempo for the next take, past the target too, and the ladder
 * never goes below it for the rest of the item. A play-along starts in its
 * plan's note value; the student may pick another, which keeps the effective
 * speed (rounded down to the 5 BPM grid), and the ladder steps within the note
 * value of the takes while comparing effective speed. A warm-up's takes
 * are never sent as practice.item_answered, since they are not evidence. An
 * item moves on after its last take, or when the student moves on; the
 * session ends after the last item, or when the student ends it. Nothing is
 * sent before start() or after the end.
 *
 * A fretboard cell is answered once, the way its drill asks: naming the note of
 * the cell shown, or tapping where the note asked is on its string. It's timed
 * and graded like an exercise. So is a diagram shape: naming which member of its
 * family it is, or tapping the degree asked on it, graded against the positions
 * of its diagram, once that's loaded. A harmony question is answered once among the options its
 * plan gives, graded and sent with the way it was asked and the options as shown.
 *
 * A single chord, or a chord's root and fifth on bass, is rated once and moves on. A minute of
 * changes between two chords (or two roots) is saved once with the tempo it was played at and the
 * clean changes counted, never more than the minute's beats; its rating follows from the two.
 *
 * After a play-along's last take, when another item follows, the run hands
 * over: it says what was played and how fast, and what's next, and moves on
 * once the student continues. A skipped item moves on at once.
 *
 * When the plan asks for a tap check, it comes before the first item: the first
 * item is shown, and timed, once the tap check is completed or skipped. After
 * the last item, the plan's felt questions about the drills the student actually
 * practised are asked, and the session ends once each has a rating or the
 * student skips them; a session left early asks none.
 */
export function usePracticeSessionRun(plan: Plan, options: PracticeSessionRunOptions = {}) {
  const { track } = useEventTracking()
  const { coreApi } = useApi()

  const index = ref(0)
  const takes = ref<RatedTake[]>([])
  /** A tempo the student chose for the next take, over the ladder's; forgotten once it's rated. */
  const chosenTempo = ref<number | null>(null)
  /** The tempo the student last chose for the item on, below which the ladder never goes. */
  const chosenFloor = ref<PlayedTempo | null>(null)
  /** A note value the student chose for the next take; forgotten once it's rated, as the take keeps it. */
  const chosenNoteValue = ref<TempoNoteValue | null>(null)
  const started = ref(false)
  const finished = ref(false)
  /** The places in the plan of the items answered, so an item asked again later counts again. */
  const answeredItems = ref(new Set<number>())
  /** How many items the student answered or rated a take of; a warm-up never counts. */
  const answeredCount = computed(() => answeredItems.value.size)
  /** What became of each item the student answered or played, by its place in the plan, for the summary. */
  const outcomes = ref(new Map<number, ItemOutcome>())
  let startedAt = 0
  /** How long the session ran, in whole minutes, at least one. */
  const elapsedMinutes = ref(0)

  const tapCheckPending = ref(plan.tap_check_due)
  const handoff = ref<Handoff | null>(null)
  /** After the last item, while the felt questions are asked. */
  const askingFelt = ref(false)
  const practisedTemplates = ref(new Set<string>())
  const feltRatings = ref<FeltRating[]>([])

  /** The plan's felt questions about drills the student practised, in the plan's order. */
  const feltQuestions = computed(() => plan.felt_questions.filter((template) => practisedTemplates.value.has(template)))

  const current = computed<Item | null>(() =>
    finished.value || askingFelt.value || tapCheckPending.value || handoff.value ? null : (plan.items[index.value] ?? null),
  )

  /** The answer to the exercise on, once given. */
  const exerciseAnswer = ref<ExerciseAnswer | null>(null)
  /** The answer to the fretboard cell on, once given. */
  const cellAnswer = ref<GradedCellAnswer | null>(null)
  /** The answer to the diagram shape on, once given. */
  const shapeAnswer = ref<GradedShapeAnswer | null>(null)
  /** The answer to the harmony question on, once given. */
  const generatedAnswer = ref<GradedGeneratedAnswer | null>(null)
  /** When the item on was shown, which an exercise's latency counts from. */
  let shownAt = 0
  /** Whether a clip of the item on is sounding, when its first one started, and when the last one ended. */
  let clipSounding = false
  let firstClipStartedAt: number | null = null
  let lastClipEndedAt: number | null = null

  // Measured up front, so each length is known by the time its exercise is answered.
  const audioMs = new Map<string, number>()
  for (const item of plan.items) {
    const exercise = item.exercise
    if (item.kind !== 'exercise' || !exercise) continue
    void measureExerciseAudio(exercise, (diagramId) => fetchDiagram(coreApi, diagramId)).then((ms) => {
      if (ms !== undefined) audioMs.set(exercise.exercise_id, ms)
    })
  }

  /**
   * The note value the next take of a play-along plays at: the student's choice, else its last
   * take's, else the plan's, and quarters for a plan that says none, as one composed before note
   * values existed doesn't.
   */
  const noteValue = computed<TempoNoteValue | null>(() => {
    const planned = current.value?.play_along ?? current.value?.progression_keys
    if (!planned) return null
    return chosenNoteValue.value ?? takes.value.at(-1)?.noteValue ?? planned.start_note_value ?? 'quarters'
  })

  /** Where the progression key tour on stands: its plan's start, moved on by each take rated so far. */
  const tour = computed<TourState | null>(() => {
    const planned = current.value?.progression_keys
    if (!planned) return null
    const limits = { target: planned.target_tempo_bpm, min: planned.min_tempo_bpm }
    return takes.value.reduce((state, take) => afterTake(state, take, limits), tourStart(planned))
  })

  const tempo = computed(() => {
    if (chosenTempo.value !== null && noteValue.value !== null) return chosenTempo.value
    if (tour.value && noteValue.value !== null) return tourTempoIn(tour.value, noteValue.value)
    const playAlong = current.value?.play_along
    if (!playAlong || noteValue.value === null) return null
    // A warm-up stays at the tempo of its last take, outside the ladder.
    if (current.value!.reason === 'warm_up') return takes.value.at(-1)?.bpm ?? playAlong.start_tempo_bpm
    return nextTempo(
      { start: playAlong.start_tempo_bpm, target: playAlong.target_tempo_bpm, noteValue: noteValue.value, chosen: chosenFloor.value },
      takes.value,
    )
  })

  /**
   * The slowest tempo the next take may be chosen at, in its note value: a play-along's ladder floor,
   * or a tour's floor; null when the item on isn't played in takes.
   */
  function slowestTempo(): number | null {
    const value = noteValue.value
    if (value === null) return null
    const playAlong = current.value?.play_along
    if (playAlong) return ladderFloorIn(playAlong.target_tempo_bpm, value)
    const planned = current.value?.progression_keys
    return planned ? Math.ceil(planned.min_tempo_bpm / speedFactor(value)) : null
  }

  /** Plays the next take at a tempo of the student's choosing, from the ladder's floor up to the fastest playable. */
  function setTempo(bpm: number) {
    const floor = slowestTempo()
    const value = noteValue.value
    if (floor === null || value === null) return
    chosenTempo.value = Math.min(MAX_TEMPO_BPM, Math.max(floor, Math.round(bpm)))
    chosenFloor.value = { bpm: chosenTempo.value, noteValue: value }
  }

  /** Plays the next take in another note value, at the same effective speed rounded down to the 5 BPM grid. */
  function setNoteValue(next: TempoNoteValue) {
    const from = noteValue.value
    const bpm = tempo.value
    if (from === null || bpm === null) return
    chosenNoteValue.value = next
    setTempo(keepEffectiveSpeed(bpm, from, next))
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
      if (item.kind === 'diagram_shape') return shapeAnswer.value ? 1 : 0
      if (item.generated_choice) return generatedAnswer.value ? 1 : 0
      const total = takesOf(item)
      return total === 0 ? 0 : takes.value.length / total
    }),
  )

  const active = () => started.value && !finished.value && !askingFelt.value

  function start() {
    if (started.value) return
    started.value = true
    shownAt = Date.now()
    startedAt = shownAt
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
    elapsedMinutes.value = Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
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
    chosenFloor.value = null
    chosenNoteValue.value = null
    exerciseAnswer.value = null
    cellAnswer.value = null
    shapeAnswer.value = null
    generatedAnswer.value = null
    shownAt = Date.now()
    clipSounding = false
    firstClipStartedAt = null
    lastClipEndedAt = null
    index.value++
    if (index.value < plan.items.length) return
    if (feltQuestions.value.length > 0) askingFelt.value = true
    else finish(false)
  }

  /** Keeps what became of the item on, at its place in the plan. */
  function recordOutcome(outcome: ItemOutcome) {
    outcomes.value = new Map(outcomes.value).set(index.value, outcome)
  }

  /** Counts the item on as answered, and its drill as practised. */
  function markAnswered(item: Item) {
    answeredItems.value = new Set(answeredItems.value).add(index.value)
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
    const played = noteValue.value
    if (!active() || !item || bpm === null || played === null) return

    // A tour's take says which key it was played in: the item holds every key.
    const key = tour.value?.key
    if (item.reason !== 'warm_up') {
      markAnswered(item)
      void track({
        event_type: 'practice.item_answered',
        practice_session_id: plan.practice_session_id,
        item_key: item.item_key,
        response: { response_type: 'self_rating', rating, tempo_bpm: bpm, note_value: played, ...(key ? { music_key: key } : {}) },
      })
    }
    takes.value = [...takes.value, { bpm, rating, noteValue: played }]
    const toured = tour.value
    if (toured) recordOutcome({ kind: 'toured', takes: takes.value, cleanKeys: toured.clean.length, tourBpm: toured.speed })
    else recordOutcome({ kind: 'played', takes: takes.value })
    chosenTempo.value = null
    chosenNoteValue.value = null
    if (takesLeft.value > 0) return
    const next = plan.items[index.value + 1]
    const fastest = takes.value.reduce((best, take) => (speedOf(take) > speedOf(best) ? take : best))
    if (next) handoff.value = { done: item, fastestBpm: fastest.bpm, fastestNoteValue: fastest.noteValue ?? 'quarters', next }
    else nextItem()
  }

  /** Records the student's rating of a single chord, or of a root and fifth, and moves on. */
  function rateChord(rating: TakeRating) {
    const item = current.value
    if (!active() || !item || (!item.chord_voicing && !item.root_fifth)) return

    markAnswered(item)
    recordOutcome({ kind: 'rated', rating })
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: { response_type: 'self_rating', rating },
    })
    nextItem()
  }

  /**
   * Records a minute of chord or root changes, one change on every beat: the tempo it was played
   * at and the clean changes counted, rated by their share of the beats, and moves on.
   */
  function saveChangeMinute(tempoBpm: number, cleanChanges: number) {
    const item = current.value
    if (!active() || !item || (!item.chord_change && !item.root_change)) return
    if (cleanChanges < 0 || cleanChanges > tempoBpm) return

    const rating = changeMinuteRating(cleanChanges, tempoBpm)
    markAnswered(item)
    recordOutcome({ kind: 'changes', tempoBpm, cleanChanges, rating })
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: { response_type: 'self_rating', rating, tempo_bpm: tempoBpm, changes_per_minute: cleanChanges },
    })
    nextItem()
  }

  /** Moves on from a play-along's handoff to the next item. */
  function continueToNext() {
    if (!handoff.value) return
    handoff.value = null
    nextItem()
  }

  /** Notes a clip of the item on starting or stopping, which a choice among sounds is timed from. */
  function clipPlaying(playing: boolean) {
    if (playing) firstClipStartedAt ??= Date.now()
    if (clipSounding && !playing) lastClipEndedAt = Date.now()
    clipSounding = playing
  }

  /**
   * How long an answer among sounds took: listening isn't answering, so it runs from the end of
   * the last clip played (0 when one is still sounding), or from when it was shown if none was.
   */
  function listeningLatency(): number {
    if (clipSounding) return 0
    return Date.now() - (lastClipEndedAt ?? shownAt)
  }

  /** Answers the exercise on with the options chosen; only the first answer counts. */
  function answer(optionIds: string[]) {
    const item = current.value
    const exercise = item?.exercise
    if (!active() || !item || item.kind !== 'exercise' || !exercise || exerciseAnswer.value || optionIds.length === 0) return

    exerciseAnswer.value = { optionIds, correct: isExactMatch(exercise.options, optionIds) }
    markAnswered(item)
    recordOutcome({ kind: 'answered', correct: exerciseAnswer.value.correct })
    const amongSounds = exercise.exercise_type === 'audio_selection'
    const audio = amongSounds ? undefined : audioMs.get(exercise.exercise_id)
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: {
        response_type: 'option_choice',
        option_ids: optionIds,
        latency_ms: amongSounds ? listeningLatency() : Date.now() - shownAt,
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
    recordOutcome({ kind: 'answered', correct })
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: { ...answer, latency_ms: Date.now() - shownAt },
    })
  }

  /**
   * Answers the diagram shape on, the way its drill asks, graded on the board its diagram draws;
   * only the first answer counts, and a degree to find must be the one asked.
   */
  function answerShape(answer: ShapeAnswer, board: ShapeBoard) {
    const item = current.value
    const shape = item?.diagram_shape
    if (!active() || !item || !shape || shapeAnswer.value || answer.response_type !== shape.drill) return
    if (answer.response_type === 'find_the_degree' && answer.interval !== shape.asked_interval) return
    const members = shape.options.map((option) => option.shape)
    const correct = gradeDiagramShape({ ...board, shape: shape.shape, members }, answer)
    if (correct === null) return

    shapeAnswer.value = { answer, correct }
    markAnswered(item)
    recordOutcome({ kind: 'answered', correct })
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: { ...answer, latency_ms: Date.now() - shownAt },
    })
  }

  /**
   * Answers the harmony question on, asked the way its plan says, graded as the record grades it;
   * only the first answer counts, and none the grader would reject. A chart question or a heard one
   * also sends the key it was asked in, which its item doesn't fix. A question asked by ear is
   * timed from when its sound first started, and sends how long that sound played.
   */
  function answerGenerated(answer: GeneratedChoiceAnswer, grading: GeneratedChoiceGrading) {
    const item = current.value
    const planned = item?.generated_choice
    if (!active() || !item || !planned || generatedAnswer.value || answer.way !== planned.way) return
    const correct = gradeGeneratedChoice(grading.question, grading.catalog, answer)
    const right = rightAnswerOf(grading.question, grading.catalog)
    if (correct === null || right === null) return

    generatedAnswer.value = { choice: answer.choice, right, correct }
    markAnswered(item)
    recordOutcome({ kind: 'answered', correct })
    const heard = planned.playback ? answer.audioMs : undefined
    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: {
        response_type: 'generated_choice',
        way: answer.way,
        ...(KEYED_BY_THE_QUESTION.includes(item.kind) ? { music_key: planned.music_key } : {}),
        options: answer.options,
        choice: answer.choice,
        latency_ms: Date.now() - (planned.playback ? (firstClipStartedAt ?? shownAt) : shownAt),
        ...(heard !== undefined ? { audio_ms: heard } : {}),
      },
    })
  }

  /**
   * Moves past an item the student couldn't answer, sending it as not answered so it is kept but
   * never graded: it counts neither as answered nor as wrong. Only an item not yet answered.
   */
  function skip(reason: NotAnsweredReason) {
    const item = current.value
    if (!active() || !item) return
    if (exerciseAnswer.value || cellAnswer.value || shapeAnswer.value || generatedAnswer.value || takes.value.length > 0) return

    void track({
      event_type: 'practice.item_answered',
      practice_session_id: plan.practice_session_id,
      item_key: item.item_key,
      response: { response_type: 'not_answered', reason },
    })
    nextItem()
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
    tour,
    noteValue,
    takesTotal,
    takesLeft,
    progress,
    answeredCount,
    outcomes,
    elapsedMinutes,
    exerciseAnswer,
    cellAnswer,
    shapeAnswer,
    generatedAnswer,
    started,
    handoff,
    tapCheckPending,
    askingFelt,
    feltQuestions,
    feltRatings,
    finished,
    start,
    setTempo,
    setNoteValue,
    rate,
    rateChord,
    saveChangeMinute,
    answer,
    clipPlaying,
    skip,
    answerCell,
    answerShape,
    answerGenerated,
    completeTapCheck,
    skipTapCheck,
    rateFelt,
    skipFelt,
    nextItem,
    continueToNext,
    end,
  }
}
