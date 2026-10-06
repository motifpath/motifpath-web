import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { ladderFloor, nextTempo } from '@/features/student/utils/tempoLadder'
import type { RatedTake, TakeRating } from '@/features/student/utils/tempoLadder'
import { useEventTracking } from '@/shared/composables/useEventTracking'
import { measureExerciseAudio } from '@/shared/utils/exerciseAudio'
import { isExactMatch } from '@/shared/utils/exerciseOptions'
import { MAX_TEMPO_BPM } from '@/shared/utils/sequence'

type Plan = components['schemas']['PracticeSessionPlan']
type Item = components['schemas']['PracticeSessionItem']

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
 * never goes below it for the rest of the item. A warm-up's takes
 * are never sent as practice.item_answered, since they are not evidence. An
 * item moves on after its last take, or when the student moves on; the
 * session ends after the last item, or when the student ends it. Nothing is
 * sent before start() or after the end.
 */
export function usePracticeSessionRun(plan: Plan) {
  const { track } = useEventTracking()

  const index = ref(0)
  const takes = ref<RatedTake[]>([])
  /** A tempo the student chose for the next take, over the ladder's; forgotten once it's rated. */
  const chosenTempo = ref<number | null>(null)
  /** The tempo the student last chose for the item on, below which the ladder never goes. */
  const chosenFloor = ref<number | null>(null)
  const started = ref(false)
  const finished = ref(false)
  const answeredItems = ref(new Set<string>())
  /** How many items the student answered or rated a take of; a warm-up never counts. */
  const answeredCount = computed(() => answeredItems.value.size)

  const current = computed<Item | null>(() => (finished.value ? null : (plan.items[index.value] ?? null)))

  /** The answer to the exercise on, once given. */
  const exerciseAnswer = ref<ExerciseAnswer | null>(null)
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
    return nextTempo({ start: playAlong.start_tempo_bpm, target: playAlong.target_tempo_bpm, chosen: chosenFloor.value }, takes.value)
  })

  /** Plays the next take at a tempo of the student's choosing, from the ladder's floor up to the fastest playable. */
  function setTempo(bpm: number) {
    const playAlong = current.value?.play_along
    if (!playAlong) return
    chosenTempo.value = Math.min(MAX_TEMPO_BPM, Math.max(ladderFloor(playAlong.target_tempo_bpm), Math.round(bpm)))
    chosenFloor.value = chosenTempo.value
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
      const total = takesOf(item)
      return total === 0 ? 0 : takes.value.length / total
    }),
  )

  const active = () => started.value && !finished.value

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
    void track(
      {
        event_type: 'practice.session_ended',
        practice_session_id: plan.practice_session_id,
        answered_count: answeredCount.value,
        left_early: leftEarly,
        felt_ratings: [],
      },
      options,
    )
  }

  /** Moves to the next item, or finishes the session after the last one. */
  function nextItem() {
    if (!active()) return
    takes.value = []
    chosenTempo.value = null
    chosenFloor.value = null
    exerciseAnswer.value = null
    shownAt = Date.now()
    index.value++
    if (index.value >= plan.items.length) finish(false)
  }

  /** Records the student's rating of the take just played at the current tempo. */
  function rate(rating: TakeRating) {
    const item = current.value
    const bpm = tempo.value
    if (!active() || !item || bpm === null) return

    if (item.reason !== 'warm_up') {
      answeredItems.value = new Set(answeredItems.value).add(item.item_key)
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
    answeredItems.value = new Set(answeredItems.value).add(item.item_key)
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

  /** Ends the session now, before its last item; `keepalive` when the page is closing. */
  function end(options: { keepalive?: boolean } = {}) {
    if (active()) finish(true, options)
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
    finished,
    start,
    setTempo,
    rate,
    answer,
    nextItem,
    end,
  }
}
