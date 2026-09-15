import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET } }),
}))

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

import { usePracticeSession } from '@/features/student/composables/usePracticeSession'

const challenge = {
  challenge_id: 'ch-1',
  content_node_id: 'node-1',
  subject_tag: 'rhythm',
  pass_threshold: 70,
  shuffle_exercises: false,
  shuffle_options: false,
  created_at: '2026-09-01T00:00:00Z',
}

const exercises = [
  {
    exercise_id: 'ex-1',
    title: 't1',
    prompt: 'p1',
    exercise_type: 'text_response' as const,
    options: [
      { option_id: 'o1', is_correct: true, label: 'Right' },
      { option_id: 'o2', is_correct: false, label: 'Wrong' },
    ],
    challenge_ids: ['ch-1'],
    content_node_ids: [],
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    exercise_id: 'ex-2',
    title: 't2',
    prompt: 'p2',
    exercise_type: 'text_response' as const,
    options: [
      { option_id: 'o3', is_correct: false, label: 'Wrong' },
      { option_id: 'o4', is_correct: true, label: 'Right' },
    ],
    challenge_ids: ['ch-1'],
    content_node_ids: [],
    created_at: '2026-09-01T00:00:00Z',
  },
]

function mockHappyPath(): void {
  GET.mockImplementation((path: string) => {
    if (path === '/content-nodes/{content_node_id}/challenges') {
      return Promise.resolve({ data: [challenge], error: undefined, response: { status: 200 } })
    }
    if (path === '/challenges/{challenge_id}/exercises') {
      return Promise.resolve({ data: exercises, error: undefined, response: { status: 200 } })
    }
    throw new Error(`unexpected path ${path}`)
  })
}

async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('usePracticeSession', () => {
  it('loads the node challenge and its exercises, landing in-progress on the first exercise', async () => {
    mockHappyPath()

    const session = usePracticeSession('node-1')
    expect(session.status.value).toBe('loading')
    await flush()

    expect(GET).toHaveBeenNthCalledWith(1, '/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: 'node-1' } },
    })
    expect(GET).toHaveBeenNthCalledWith(2, '/challenges/{challenge_id}/exercises', {
      params: { path: { challenge_id: 'ch-1' } },
    })
    expect(session.status.value).toBe('in-progress')
    expect(session.currentExercise.value?.exercise_id).toBe('ex-1')
  })

  it('lands on empty when the node has no challenges', async () => {
    GET.mockResolvedValueOnce({ data: [], error: undefined, response: { status: 200 } })

    const session = usePracticeSession('node-1')
    await flush()

    expect(session.status.value).toBe('empty')
  })

  it('lands on error when the challenges request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const session = usePracticeSession('node-1')
    await flush()

    expect(session.status.value).toBe('error')
  })

  it('records the selected option and whether it was correct', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select('o2')

    expect(session.currentAnswer.value).toEqual({ optionId: 'o2', isCorrect: false })
  })

  it('advances to the next exercise and preserves a prior answer when navigating back', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select('o1')
    session.next()
    expect(session.currentExercise.value?.exercise_id).toBe('ex-2')
    expect(session.currentAnswer.value).toBeNull()

    session.back()
    expect(session.currentExercise.value?.exercise_id).toBe('ex-1')
    expect(session.currentAnswer.value).toEqual({ optionId: 'o1', isCorrect: true })
  })

  it('moves to result after Next on the last exercise and reports the score', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select('o1')
    session.next()
    session.select('o4')
    session.next()

    expect(session.status.value).toBe('result')
    expect(session.score.value).toEqual({ correct: 2, total: 2 })
  })

  it('tracks exercise.started once on entering an exercise, exercise.answer_sent on selection, and exercise.ended on Next', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'exercise.started', exercise_id: 'ex-1' }),
    )

    session.select('o1')
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'exercise.answer_sent',
        exercise_id: 'ex-1',
        attempt_number: 1,
      }),
    )

    session.next()
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'exercise.ended',
        exercise_id: 'ex-1',
        outcome: 'completed',
        final_score: 100,
      }),
    )
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'exercise.started', exercise_id: 'ex-2' }),
    )
  })

  it('tracks exercise.ended with outcome abandoned when advancing past an unanswered exercise', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.next()

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'exercise.ended', exercise_id: 'ex-1', outcome: 'abandoned' }),
    )
  })
})
