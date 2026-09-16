import { computed, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { useEventTracking } from '@/shared/composables/useEventTracking'
import type { components } from '@/api/generated/core-domain'

type Challenge = components['schemas']['Challenge']
type Exercise = components['schemas']['Exercise']

export type PracticeSessionStatus = 'loading' | 'error' | 'empty' | 'in-progress' | 'result'

interface Answer {
  optionIds: string[]
  isCorrect: boolean
}

// Correct iff the selected set exactly matches the set of options marked
// is_correct — an exercise can have more than one correct option, and
// matching only a subset (or a superset) does not count.
function isExactMatch(exercise: Exercise, optionIds: string[]): boolean {
  const correctIds = exercise.options.filter((option) => option.is_correct).map((option) => option.option_id)
  if (correctIds.length !== optionIds.length) return false
  const selected = new Set(optionIds)
  return correctIds.every((id) => selected.has(id))
}

/**
 * Drives one attempt at a content node's challenge: loads the node's
 * challenge and its exercises, steps through them one at a time (Back
 * re-shows a prior answer rather than clearing it), and reports a score once
 * the last exercise is passed. Only the node's first returned challenge is
 * run — the wireframe assumes one challenge per node. Reloads whenever
 * nodeId changes, since Vue Router reuses a mounted component when only a
 * param on the same route record changes.
 */
export function usePracticeSession(nodeId: MaybeRefOrGetter<string>) {
  const { coreApi } = useApi()
  const { track } = useEventTracking()

  const status = ref<PracticeSessionStatus>('loading')
  const challenge = ref<Challenge | null>(null)
  const exercises = ref<Exercise[]>([])
  const currentIndex = ref(0)
  const answers = ref<Record<string, Answer>>({})
  const attemptCounts = ref<Record<string, number>>({})
  const startedExerciseIds = new Set<string>()
  const endedExerciseIds = new Set<string>()

  const currentExercise = computed<Exercise | null>(() => exercises.value[currentIndex.value] ?? null)
  const currentAnswer = computed<Answer | null>(() => {
    const exercise = currentExercise.value
    return exercise ? (answers.value[exercise.exercise_id] ?? null) : null
  })
  const isLastExercise = computed(() => currentIndex.value === exercises.value.length - 1)
  // An unanswered exercise can still be advanced past programmatically (it's
  // tracked as an abandoned attempt) — canAdvance is what the UI gates its
  // Next control on, so a student can't casually skip one from the button.
  const canAdvance = computed(() => currentAnswer.value !== null)
  const score = computed(() => ({
    correct: Object.values(answers.value).filter((answer) => answer.isCorrect).length,
    total: exercises.value.length,
  }))

  function triggerContext() {
    return {
      source: 'challenge_sequence' as const,
      content_node_id: toValue(nodeId),
      challenge_id: challenge.value?.challenge_id,
    }
  }

  function trackExerciseStart(): void {
    const exercise = currentExercise.value
    if (!exercise || startedExerciseIds.has(exercise.exercise_id)) return
    startedExerciseIds.add(exercise.exercise_id)
    void track({ event_type: 'exercise.started', exercise_id: exercise.exercise_id, trigger_context: triggerContext() })
  }

  // Fires exercise.ended at most once per exercise_id — next() calls this to
  // close out the exercise being left, and the unmount hook below calls it
  // again for whichever exercise was current when the student navigated away
  // without clicking Next (e.g. "‹ Back to lesson"); the guard makes calling
  // it from both places safe.
  function endCurrentExercise(): void {
    const exercise = currentExercise.value
    if (!exercise || endedExerciseIds.has(exercise.exercise_id)) return
    endedExerciseIds.add(exercise.exercise_id)

    const answer = answers.value[exercise.exercise_id]
    void track({
      event_type: 'exercise.ended',
      exercise_id: exercise.exercise_id,
      trigger_context: triggerContext(),
      outcome: answer ? 'completed' : 'abandoned',
      ...(answer ? { final_score: answer.isCorrect ? 100 : 0 } : {}),
    })
  }

  // Bumped on every load() call; a call only applies its result if it's
  // still the most recent one by the time it resolves, so an overlapping
  // retry can't have its outcome clobbered by a slower, stale request.
  let loadEpoch = 0

  async function load(): Promise<void> {
    const myEpoch = ++loadEpoch
    status.value = 'loading'

    const challengesResult = await coreApi.GET('/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: toValue(nodeId) } },
    })
    if (myEpoch !== loadEpoch) return
    if (challengesResult.error || !challengesResult.data) {
      status.value = 'error'
      return
    }
    const [firstChallenge] = challengesResult.data
    if (!firstChallenge) {
      status.value = 'empty'
      return
    }

    const exercisesResult = await coreApi.GET('/challenges/{challenge_id}/exercises', {
      params: { path: { challenge_id: firstChallenge.challenge_id } },
    })
    if (myEpoch !== loadEpoch) return
    if (exercisesResult.error || !exercisesResult.data) {
      status.value = 'error'
      return
    }
    if (exercisesResult.data.length === 0) {
      status.value = 'empty'
      return
    }

    challenge.value = firstChallenge
    exercises.value = exercisesResult.data
    currentIndex.value = 0
    answers.value = {}
    attemptCounts.value = {}
    startedExerciseIds.clear()
    endedExerciseIds.clear()
    status.value = 'in-progress'
    trackExerciseStart()
  }

  // optionIds is the full selected set, not a single toggle — ExerciseView
  // owns the toggle-on-click logic and emits its resulting set each time.
  function select(optionIds: string[]): void {
    const exercise = currentExercise.value
    if (!exercise) return

    if (optionIds.length === 0) {
      // Deselecting back down to nothing is "unanswered again," not "answered
      // with zero options" — no entry, not an entry with an empty array, so
      // canAdvance/endCurrentExercise's completed-vs-abandoned check both
      // treat it the same as never having answered.
      const rest = { ...answers.value }
      delete rest[exercise.exercise_id]
      answers.value = rest
    } else {
      answers.value = {
        ...answers.value,
        [exercise.exercise_id]: { optionIds, isCorrect: isExactMatch(exercise, optionIds) },
      }
    }

    const attemptNumber = (attemptCounts.value[exercise.exercise_id] ?? 0) + 1
    attemptCounts.value = { ...attemptCounts.value, [exercise.exercise_id]: attemptNumber }

    void track({
      event_type: 'exercise.answer_sent',
      exercise_id: exercise.exercise_id,
      trigger_context: triggerContext(),
      attempt_number: attemptNumber,
      answer_payload: { option_ids: optionIds },
    })
  }

  function next(): void {
    endCurrentExercise()

    if (isLastExercise.value) {
      status.value = 'result'
      return
    }
    currentIndex.value += 1
    trackExerciseStart()
  }

  function back(): void {
    // currentIndex never moves past the last exercise (next() only flips
    // status to 'result' on the last one) — so leaving the result screen
    // just needs to un-flip status, already landing back on that exercise.
    if (status.value === 'result') {
      status.value = 'in-progress'
      return
    }
    if (currentIndex.value === 0) return
    currentIndex.value -= 1
  }

  watch(() => toValue(nodeId), () => void load(), { immediate: true })

  onUnmounted(() => {
    if (status.value === 'in-progress') endCurrentExercise()
  })

  return {
    status,
    challenge,
    exercises,
    currentIndex,
    currentExercise,
    currentAnswer,
    isLastExercise,
    canAdvance,
    score,
    select,
    next,
    back,
    retry: load,
  }
}
