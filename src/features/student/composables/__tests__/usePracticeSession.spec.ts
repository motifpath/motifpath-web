import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

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

// Two correct answers required — exercises exercising multi-select scoring.
const multiCorrectExercise = {
  exercise_id: 'ex-multi',
  title: 't-multi',
  prompt: 'p-multi',
  exercise_type: 'image_recognition' as const,
  options: [
    { option_id: 'm1', is_correct: true, region: { x: 0, y: 0, width: 0.1, height: 0.1, shape: 'circle' as const } },
    { option_id: 'm2', is_correct: true, region: { x: 0.5, y: 0.5, width: 0.1, height: 0.1, shape: 'circle' as const } },
    { option_id: 'm3', is_correct: false, region: { x: 0.8, y: 0.8, width: 0.1, height: 0.1, shape: 'circle' as const } },
  ],
  challenge_ids: ['ch-1'],
  content_node_ids: [],
  created_at: '2026-09-01T00:00:00Z',
}

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

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
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
      signal: expect.any(AbortSignal),
    })
    expect(GET).toHaveBeenNthCalledWith(2, '/challenges/{challenge_id}/exercises', {
      params: { path: { challenge_id: 'ch-1' } },
      signal: expect.any(AbortSignal),
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

  it('records the selected options and whether they exactly match the correct set', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o2'])

    expect(session.currentAnswer.value).toEqual({ optionIds: ['o2'], isCorrect: false })
  })

  it('scores a multi-correct exercise correct only when the exact correct set is selected', async () => {
    GET.mockImplementation((path: string) => {
      if (path === '/content-nodes/{content_node_id}/challenges') {
        return Promise.resolve({ data: [challenge], error: undefined, response: { status: 200 } })
      }
      return Promise.resolve({ data: [multiCorrectExercise], error: undefined, response: { status: 200 } })
    })
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['m1']) // partial — missing m2
    expect(session.currentAnswer.value?.isCorrect).toBe(false)

    session.select(['m1', 'm2']) // exact match
    expect(session.currentAnswer.value?.isCorrect).toBe(true)

    session.select(['m1', 'm2', 'm3']) // over-selected — no longer exact
    expect(session.currentAnswer.value?.isCorrect).toBe(false)
  })

  it('treats deselecting back down to nothing as unanswered again, and does not send answer_sent for it', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o1'])
    expect(session.currentAnswer.value).not.toBeNull()

    track.mockClear()
    session.select([])
    expect(session.currentAnswer.value).toBeNull()
    expect(session.canAdvance.value).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('advances to the next exercise and preserves a prior answer when navigating back', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o1'])
    session.next()
    expect(session.currentExercise.value?.exercise_id).toBe('ex-2')
    expect(session.currentAnswer.value).toBeNull()

    session.back()
    expect(session.currentExercise.value?.exercise_id).toBe('ex-1')
    expect(session.currentAnswer.value).toEqual({ optionIds: ['o1'], isCorrect: true })
  })

  it('moves to result after Next on the last exercise and reports the score', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o1'])
    session.next()
    session.select(['o4'])
    session.next()

    expect(session.status.value).toBe('result')
    expect(session.score.value).toEqual({ correct: 2, total: 2 })
  })

  it('reports scorePercent and a success/warning/danger tier against the challenge pass_threshold', async () => {
    // pass_threshold 70: 2/2 = 100% -> success; below is exercised separately.
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o1'])
    session.next()
    session.select(['o4'])
    session.next()

    expect(session.scorePercent.value).toBe(100)
    expect(session.scoreTier.value).toBe('success')
  })

  it('reports a warning tier below the threshold but above half of it, and danger further below', async () => {
    GET.mockImplementation((path: string) => {
      if (path === '/content-nodes/{content_node_id}/challenges') {
        return Promise.resolve({ data: [challenge], error: undefined, response: { status: 200 } }) // pass_threshold 70
      }
      return Promise.resolve({ data: exercises, error: undefined, response: { status: 200 } })
    })
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o2']) // wrong
    session.next()
    session.select(['o4']) // right — 1/2 = 50%, below 70 but above 35
    session.next()
    expect(session.scorePercent.value).toBe(50)
    expect(session.scoreTier.value).toBe('warning')
  })

  it('reports a danger tier well below the threshold', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o2']) // wrong
    session.next()
    session.select(['o3']) // wrong — 0/2 = 0%
    session.next()
    expect(session.scorePercent.value).toBe(0)
    expect(session.scoreTier.value).toBe('danger')
  })

  it('returns to the last exercise (not a further-back one) when Back is pressed from the result screen', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o1'])
    session.next()
    session.select(['o4'])
    session.next()
    expect(session.status.value).toBe('result')

    session.back()

    expect(session.status.value).toBe('in-progress')
    expect(session.currentExercise.value?.exercise_id).toBe('ex-2')
    expect(session.currentAnswer.value).toEqual({ optionIds: ['o4'], isCorrect: true })
  })

  it('tracks exercise.started once on entering an exercise, exercise.answer_sent on selection, and exercise.ended on Next', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'exercise.started', exercise_id: 'ex-1' }),
    )

    session.select(['o1'])
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'exercise.answer_sent',
        exercise_id: 'ex-1',
        attempt_number: 1,
        answer_payload: { option_ids: ['o1'] },
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

  it('does not re-fire exercise.ended when Next is pressed again after revisiting an already-ended exercise', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    session.select(['o1'])
    session.next() // ends ex-1 (completed)
    session.back() // revisits ex-1
    track.mockClear()
    session.next() // should NOT re-end ex-1

    expect(track).not.toHaveBeenCalledWith(expect.objectContaining({ event_type: 'exercise.ended', exercise_id: 'ex-1' }))
  })

  it('does not advance the UI-gating canAdvance flag until the current exercise is answered', async () => {
    mockHappyPath()
    const session = usePracticeSession('node-1')
    await flush()

    expect(session.canAdvance.value).toBe(false)
    session.select(['o1'])
    expect(session.canAdvance.value).toBe(true)
  })

  it('reloads when nodeId changes, since the same route record can be reused across nodes', async () => {
    GET.mockImplementation((path: string, opts: { params: { path: { content_node_id?: string; challenge_id?: string } } }) => {
      if (path === '/content-nodes/{content_node_id}/challenges') {
        return Promise.resolve({
          data: [{ ...challenge, challenge_id: `ch-${opts.params.path.content_node_id}` }],
          error: undefined,
          response: { status: 200 },
        })
      }
      return Promise.resolve({ data: exercises, error: undefined, response: { status: 200 } })
    })

    const nodeId = ref('node-1')
    const session = usePracticeSession(nodeId)
    await flush()
    expect(session.challenge.value?.challenge_id).toBe('ch-node-1')

    nodeId.value = 'node-2'
    await flush()

    expect(session.challenge.value?.challenge_id).toBe('ch-node-2')
  })

  it('ignores a stale load() that resolves after a newer one has already started', async () => {
    const first = defer<{ data: unknown; error: undefined; response: { status: number } }>()
    const second = defer<{ data: unknown; error: undefined; response: { status: number } }>()
    GET.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)

    const session = usePracticeSession('node-1')
    void session.retry() // second, overlapping call

    second.resolve({ data: [], error: undefined, response: { status: 200 } }) // resolves first: lands on 'empty'
    await flush()
    expect(session.status.value).toBe('empty')

    first.resolve({ data: undefined, error: undefined, response: { status: 500 } }) // stale — must not apply
    await flush()

    expect(session.status.value).toBe('empty')
  })

  it('aborts the previous in-flight request when a newer load() supersedes it', async () => {
    const first = defer<{ data: unknown; error: undefined; response: { status: number } }>()
    const second = defer<{ data: unknown; error: undefined; response: { status: number } }>()
    let firstSignal: AbortSignal | undefined
    GET.mockImplementationOnce((_path: string, opts: { signal?: AbortSignal }) => {
      firstSignal = opts.signal
      return first.promise
    }).mockImplementationOnce(() => second.promise)

    const session = usePracticeSession('node-1')
    expect(firstSignal?.aborted).toBe(false)

    void session.retry() // supersedes the first call

    expect(firstSignal?.aborted).toBe(true)

    second.resolve({ data: [], error: undefined, response: { status: 200 } })
    await flush()
  })

  it('tracks exercise.ended for the current exercise on unmount if it was never ended', async () => {
    mockHappyPath()
    let sessionRef: ReturnType<typeof usePracticeSession> | undefined
    const TestComponent = defineComponent({
      setup() {
        sessionRef = usePracticeSession('node-1')
        return () => h('div')
      },
    })

    const wrapper = mount(TestComponent)
    await flush()
    sessionRef?.select(['o1'])

    wrapper.unmount()

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'exercise.ended',
        exercise_id: 'ex-1',
        outcome: 'completed',
        final_score: 100,
      }),
    )
  })
})
