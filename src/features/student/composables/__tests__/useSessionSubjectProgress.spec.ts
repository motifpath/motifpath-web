import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useSessionSubjectProgress } from '@/features/student/composables/useSessionSubjectProgress'

const SESSION = '11111111-1111-4111-8111-111111111111'
const GUITAR = '22222222-2222-4222-8222-222222222222'
const CHORDS = 'aaaaaaaa-0000-4000-8000-000000000001'
const NOTES = 'aaaaaaaa-0000-4000-8000-000000000002'

const subjects = [{ node_id: CHORDS, current_rung: 'hear', rungs: [{ rung: 'know', level: 'accurate' }] }]

function answer(caughtUp: boolean) {
  return { data: { caught_up: caughtUp, subjects }, response: { status: 200 } }
}

describe('useSessionSubjectProgress', () => {
  beforeEach(() => {
    GET.mockReset()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('waits until started', () => {
    const { levels } = useSessionSubjectProgress()

    expect(levels.value).toEqual({ state: 'unknown' })
    expect(GET).not.toHaveBeenCalled()
  })

  it('reads the session’s subjects on the instrument and is read once caught up', async () => {
    GET.mockResolvedValueOnce(answer(true))
    const { levels, start } = useSessionSubjectProgress()

    start(SESSION, GUITAR, [CHORDS, NOTES])
    expect(levels.value).toEqual({ state: 'pending' })
    await vi.waitFor(() => expect(levels.value).toEqual({ state: 'read', subjects }))

    expect(GET).toHaveBeenCalledWith('/students/me/practice-sessions/{practice_session_id}/subject-progress', {
      params: { path: { practice_session_id: SESSION }, query: { instrument_id: GUITAR, node_id: [CHORDS, NOTES] } },
    })
  })

  it('in the head asks with no instrument', async () => {
    GET.mockResolvedValueOnce(answer(true))
    const { levels, start } = useSessionSubjectProgress()

    start(SESSION, null, [CHORDS])
    await vi.waitFor(() => expect(levels.value.state).toBe('read'))

    expect(GET).toHaveBeenCalledWith(expect.any(String), {
      params: { path: { practice_session_id: SESSION }, query: { node_id: [CHORDS] } },
    })
  })

  it('reads again every second until the session is caught up', async () => {
    GET.mockResolvedValueOnce(answer(false)).mockResolvedValueOnce(answer(false)).mockResolvedValueOnce(answer(true))
    const { levels, start } = useSessionSubjectProgress()

    start(SESSION, GUITAR, [CHORDS])
    await vi.advanceTimersByTimeAsync(999)
    expect(GET).toHaveBeenCalledTimes(1)
    expect(levels.value).toEqual({ state: 'pending' })

    await vi.advanceTimersByTimeAsync(1)
    expect(GET).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1000)

    expect(GET).toHaveBeenCalledTimes(3)
    expect(levels.value).toEqual({ state: 'read', subjects })
  })

  it('gives up after 5 seconds without catching up, a failed read included', async () => {
    GET.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } }).mockResolvedValue(answer(false))
    const { levels, start } = useSessionSubjectProgress()

    start(SESSION, GUITAR, [CHORDS])
    await vi.advanceTimersByTimeAsync(4999)
    expect(levels.value).toEqual({ state: 'pending' })

    await vi.advanceTimersByTimeAsync(1)
    expect(levels.value).toEqual({ state: 'unknown' })
    expect(GET).toHaveBeenCalledTimes(6)

    await vi.advanceTimersByTimeAsync(5000)
    expect(GET).toHaveBeenCalledTimes(6)
  })

  it('with no subject reads nothing', () => {
    const { levels, start } = useSessionSubjectProgress()

    start(SESSION, GUITAR, [])

    expect(levels.value).toEqual({ state: 'unknown' })
    expect(GET).not.toHaveBeenCalled()
  })

  it('stops reading once stopped, and once its scope ends', async () => {
    GET.mockResolvedValue(answer(false))
    const scope = effectScope()
    const progress = scope.run(() => useSessionSubjectProgress())!

    progress.start(SESSION, GUITAR, [CHORDS])
    await vi.advanceTimersByTimeAsync(0)
    progress.stop()
    expect(progress.levels.value).toEqual({ state: 'unknown' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(GET).toHaveBeenCalledTimes(1)

    progress.start(SESSION, GUITAR, [CHORDS])
    await vi.advanceTimersByTimeAsync(0)
    scope.stop()
    await vi.advanceTimersByTimeAsync(3000)
    expect(GET).toHaveBeenCalledTimes(2)
  })

  it('a new start drops the reads of the one before', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    GET.mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve))).mockResolvedValueOnce(answer(false))
    const { levels, start } = useSessionSubjectProgress()

    start(SESSION, GUITAR, [CHORDS])
    start('33333333-3333-4333-8333-333333333333', GUITAR, [NOTES])
    answerFirst(answer(true))
    await vi.advanceTimersByTimeAsync(0)

    expect(levels.value).toEqual({ state: 'pending' })
  })
})
