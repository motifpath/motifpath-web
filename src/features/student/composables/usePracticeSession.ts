import { computed, ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { useEventTracking } from '@/shared/composables/useEventTracking'
import type { components } from '@/api/generated/core-domain'

type Challenge = components['schemas']['Challenge']
type Exercise = components['schemas']['Exercise']

export type PracticeSessionStatus = 'loading' | 'error' | 'empty' | 'in-progress' | 'result'

interface Answer {
  optionId: string
  isCorrect: boolean
}

/**
 * Drives one attempt at a content node's challenge: loads the node's
 * challenge and its exercises, steps through them one at a time (Back
 * re-shows a prior answer rather than clearing it), and reports a score once
 * the last exercise is passed. Only the node's first returned challenge is
 * run — the wireframe assumes one challenge per node.
 */
export function usePracticeSession(nodeId: string) {
  const { coreApi } = useApi()
  const { track } = useEventTracking()

  const status = ref<PracticeSessionStatus>('loading')
  const challenge = ref<Challenge | null>(null)
  const exercises = ref<Exercise[]>([])
  const currentIndex = ref(0)
  const answers = ref<Record<string, Answer>>({})
  const attemptCounts = ref<Record<string, number>>({})
  const startedExerciseIds = new Set<string>()

  const currentExercise = computed<Exercise | null>(() => exercises.value[currentIndex.value] ?? null)
  const currentAnswer = computed<Answer | null>(() => {
    const exercise = currentExercise.value
    return exercise ? (answers.value[exercise.exercise_id] ?? null) : null
  })
  const isLastExercise = computed(() => currentIndex.value === exercises.value.length - 1)
  const score = computed(() => ({
    correct: Object.values(answers.value).filter((answer) => answer.isCorrect).length,
    total: exercises.value.length,
  }))

  function triggerContext() {
    return {
      source: 'challenge_sequence' as const,
      content_node_id: nodeId,
      challenge_id: challenge.value?.challenge_id,
    }
  }

  function trackExerciseStart(): void {
    const exercise = currentExercise.value
    if (!exercise || startedExerciseIds.has(exercise.exercise_id)) return
    startedExerciseIds.add(exercise.exercise_id)
    void track({ event_type: 'exercise.started', exercise_id: exercise.exercise_id, trigger_context: triggerContext() })
  }

  async function load(): Promise<void> {
    status.value = 'loading'

    const challengesResult = await coreApi.GET('/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: nodeId } },
    })
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
    status.value = 'in-progress'
    trackExerciseStart()
  }

  function select(optionId: string): void {
    const exercise = currentExercise.value
    const option = exercise?.options.find((candidate) => candidate.option_id === optionId)
    if (!exercise || !option) return

    answers.value = { ...answers.value, [exercise.exercise_id]: { optionId, isCorrect: option.is_correct } }
    const attemptNumber = (attemptCounts.value[exercise.exercise_id] ?? 0) + 1
    attemptCounts.value = { ...attemptCounts.value, [exercise.exercise_id]: attemptNumber }

    void track({
      event_type: 'exercise.answer_sent',
      exercise_id: exercise.exercise_id,
      trigger_context: triggerContext(),
      attempt_number: attemptNumber,
      answer_payload: { option_id: optionId },
    })
  }

  function next(): void {
    const exercise = currentExercise.value
    if (exercise) {
      const answer = answers.value[exercise.exercise_id]
      void track({
        event_type: 'exercise.ended',
        exercise_id: exercise.exercise_id,
        trigger_context: triggerContext(),
        outcome: answer ? 'completed' : 'abandoned',
        ...(answer ? { final_score: answer.isCorrect ? 100 : 0 } : {}),
      })
    }

    if (isLastExercise.value) {
      status.value = 'result'
      return
    }
    currentIndex.value += 1
    trackExerciseStart()
  }

  function back(): void {
    if (currentIndex.value === 0) return
    currentIndex.value -= 1
  }

  void load()

  return {
    status,
    challenge,
    exercises,
    currentIndex,
    currentExercise,
    currentAnswer,
    isLastExercise,
    score,
    select,
    next,
    back,
    retry: load,
  }
}
