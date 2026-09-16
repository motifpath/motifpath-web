import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: {}, eventApi: { POST } }),
}))

const currentUser = reactive({ profile: { user_id: 'student-1' } as { user_id: string } | null })
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import { useEventTracking } from '@/shared/composables/useEventTracking'

describe('useEventTracking', () => {
  beforeEach(() => {
    POST.mockReset()
    POST.mockResolvedValue({ data: { event_id: 'e-1', received_at: '2026-09-15T00:00:00Z' }, error: undefined })
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
    const [path, init] = POST.mock.calls[0] as [string, { body: Record<string, unknown> }]
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

    const firstBody = POST.mock.calls[0]?.[1].body as { session_id: string }
    const secondBody = POST.mock.calls[1]?.[1].body as { session_id: string }
    expect(firstBody.session_id).toBe(secondBody.session_id)
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
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' } })
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
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' } })
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

  it('does not throw when the network request itself rejects', async () => {
    POST.mockRejectedValueOnce(new Error('network down'))
    const { track } = useEventTracking()

    await expect(
      track({
        event_type: 'exercise.started',
        exercise_id: 'ex-1',
        trigger_context: { source: 'challenge_sequence' },
      }),
    ).resolves.toBeUndefined()
  })
})
