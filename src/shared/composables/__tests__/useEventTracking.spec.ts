import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type PostEvents = (
  path: '/events',
  init: { body: Record<string, unknown>; keepalive?: boolean },
) => Promise<{
  data?: { event_id: string; received_at: string }
  error?: { message: string }
  response: { status: number }
}>

const POST = vi.fn<PostEvents>()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: {}, eventApi: { POST } }),
}))

const currentUser = reactive({ profile: { user_id: 'student-1' } as { user_id: string } | null })
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import { useEventTracking } from '@/shared/composables/useEventTracking'

function accepted() {
  return { data: { event_id: 'e-1', received_at: '2026-09-15T00:00:00Z' }, error: undefined, response: { status: 202 } }
}

function failedWith(status: number) {
  return { data: undefined, error: { message: 'boom' }, response: { status } }
}

const startedEvent = {
  event_type: 'exercise.started',
  exercise_id: 'ex-1',
  trigger_context: { source: 'challenge_sequence' },
} as const

describe('useEventTracking', () => {
  beforeEach(() => {
    POST.mockReset()
    POST.mockResolvedValue(accepted())
    currentUser.profile = { user_id: 'student-1' }
  })

  it('posts a tracking event with a generated envelope around the caller-supplied fields', async () => {
    const { track } = useEventTracking()

    await track({
      event_type: 'exercise.started',
      exercise_id: 'ex-1',
      trigger_context: { source: 'challenge_sequence', content_node_id: 'node-1', challenge_id: 'ch-1' },
    })

    expect(POST).toHaveBeenCalledTimes(1)
    const [path, init] = POST.mock.calls[0]!
    expect(path).toBe('/events')
    expect(init.body).toMatchObject({
      event_type: 'exercise.started',
      student_id: 'student-1',
      exercise_id: 'ex-1',
      trigger_context: { source: 'challenge_sequence', content_node_id: 'node-1', challenge_id: 'ch-1' },
    })
    expect(typeof init.body.event_id).toBe('string')
    expect(typeof init.body.session_id).toBe('string')
    expect(typeof init.body.occurred_at).toBe('string')
  })

  it('reuses the same session_id across multiple events', async () => {
    const { track } = useEventTracking()

    await track({
      event_type: 'exercise.started',
      exercise_id: 'ex-1',
      trigger_context: { source: 'challenge_sequence' },
    })
    await track({
      event_type: 'exercise.ended',
      exercise_id: 'ex-1',
      trigger_context: { source: 'challenge_sequence' },
      outcome: 'completed',
      final_score: 100,
    })

    const firstBody = POST.mock.calls[0]?.[1].body
    const secondBody = POST.mock.calls[1]?.[1].body
    expect(firstBody?.session_id).toBe(secondBody?.session_id)
  })

  it('sends with keepalive when asked, so the request outlives a closing page', async () => {
    const { track } = useEventTracking()

    await track(
      { event_type: 'exercise.started', exercise_id: 'ex-1', trigger_context: { source: 'challenge_sequence' } },
      { keepalive: true },
    )

    expect(POST.mock.calls[0]?.[1].keepalive).toBe(true)
  })

  it('sends without keepalive by default', async () => {
    const { track } = useEventTracking()

    await track({ event_type: 'exercise.started', exercise_id: 'ex-1', trigger_context: { source: 'challenge_sequence' } })

    expect(POST.mock.calls[0]?.[1].keepalive).toBeUndefined()
  })

  it('does nothing when there is no registered student to attribute the event to', async () => {
    currentUser.profile = null
    const { track } = useEventTracking()

    await track({
      event_type: 'exercise.started',
      exercise_id: 'ex-1',
      trigger_context: { source: 'challenge_sequence' },
    })

    expect(POST).not.toHaveBeenCalled()
  })

  it('does not throw when the event fails to post', async () => {
    POST.mockResolvedValueOnce(failedWith(400))
    const { track } = useEventTracking()

    await expect(
      track({
        event_type: 'exercise.started',
        exercise_id: 'ex-1',
        trigger_context: { source: 'challenge_sequence' },
      }),
    ).resolves.toBeUndefined()
  })

  it('warns when the server rejects the event, since openapi-fetch resolves HTTP errors rather than throwing', async () => {
    POST.mockResolvedValueOnce(failedWith(400))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { track } = useEventTracking()

    await track({
      event_type: 'exercise.started',
      exercise_id: 'ex-1',
      trigger_context: { source: 'challenge_sequence' },
    })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rejected'), 'exercise.started', { message: 'boom' })
    warn.mockRestore()
  })

})

describe('useEventTracking retries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    POST.mockReset()
    POST.mockResolvedValue(accepted())
    currentUser.profile = { user_id: 'student-1' }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function trackAndSettle(options: { keepalive?: boolean } = {}): Promise<void> {
    const { track } = useEventTracking()
    const sent = track(startedEvent, options)
    await vi.runAllTimersAsync()
    await sent
  }

  it('resends the same event after a network failure, so ingestion stores it once', async () => {
    POST.mockRejectedValueOnce(new Error('network down'))

    await trackAndSettle()

    expect(POST).toHaveBeenCalledTimes(2)
    const first = POST.mock.calls[0]![1].body
    const second = POST.mock.calls[1]![1].body
    expect(second).toEqual(first)
  })

  it.each([500, 503, 408, 429])('resends after a %i response', async (status) => {
    POST.mockResolvedValueOnce(failedWith(status))

    await trackAndSettle()

    expect(POST).toHaveBeenCalledTimes(2)
  })

  it.each([400, 401, 403, 404, 422])('never resends after a %i response, and warns', async (status) => {
    POST.mockResolvedValueOnce(failedWith(status))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await trackAndSettle()

    expect(POST).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rejected'), 'exercise.started', { message: 'boom' })
    warn.mockRestore()
  })

  it('waits longer before each resend', async () => {
    POST.mockRejectedValue(new Error('network down'))
    const { track } = useEventTracking()

    const sent = track(startedEvent)
    await vi.advanceTimersByTimeAsync(0)
    expect(POST).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(499)
    expect(POST).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(POST).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(999)
    expect(POST).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(POST).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(1999)
    expect(POST).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(POST).toHaveBeenCalledTimes(4)

    await sent
  })

  it('gives up after four attempts without throwing, and warns once', async () => {
    POST.mockRejectedValue(new Error('network down'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(trackAndSettle()).resolves.toBeUndefined()

    expect(POST).toHaveBeenCalledTimes(4)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not delivered'), 'exercise.started')
    warn.mockRestore()
  })

  it('keeps keepalive on every resend', async () => {
    POST.mockRejectedValueOnce(new Error('network down'))

    await trackAndSettle({ keepalive: true })

    expect(POST.mock.calls.map(([, init]) => init.keepalive)).toEqual([true, true])
  })
})
