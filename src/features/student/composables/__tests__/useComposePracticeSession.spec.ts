import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST } }),
}))

import { useComposePracticeSession } from '@/features/student/composables/useComposePracticeSession'

const GUITAR = '22222222-2222-4222-8222-222222222222'
const plan = { practice_session_id: 's-1', instrument_id: GUITAR, minutes: 10, items: [] }

describe('useComposePracticeSession', () => {
  beforeEach(() => POST.mockReset())

  it('composes a session for the instrument in hand and the minutes', async () => {
    POST.mockResolvedValueOnce({ data: plan, response: { status: 200 } })
    const { compose } = useComposePracticeSession()

    await expect(compose(GUITAR, 10)).resolves.toEqual({ kind: 'composed', plan })
    expect(POST).toHaveBeenCalledWith('/students/me/practice-sessions', { body: { instrument_id: GUITAR, minutes: 10 } })
  })

  it('composes a session in the head with no instrument', async () => {
    POST.mockResolvedValueOnce({ data: { ...plan, instrument_id: null }, response: { status: 200 } })

    await useComposePracticeSession().compose(null, 5)

    expect(POST).toHaveBeenCalledWith('/students/me/practice-sessions', { body: { instrument_id: null, minutes: 5 } })
  })

  it('says composing while the request is in flight', async () => {
    let resolve: (value: unknown) => void = () => {}
    POST.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const { compose, isComposing } = useComposePracticeSession()

    const pending = compose(GUITAR, 10)
    expect(isComposing.value).toBe(true)
    resolve({ data: plan, response: { status: 200 } })
    await pending
    expect(isComposing.value).toBe(false)
  })

  it('tells nothing to practise on the instrument apart', async () => {
    POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })

    await expect(useComposePracticeSession().compose(GUITAR, 10)).resolves.toEqual({ kind: 'nothing_to_practise' })
  })

  it('fails on any other error, a network one included', async () => {
    POST.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } })
    POST.mockRejectedValueOnce(new TypeError('offline'))
    const { compose, isComposing } = useComposePracticeSession()

    await expect(compose(GUITAR, 10)).resolves.toEqual({ kind: 'failed' })
    await expect(compose(GUITAR, 10)).resolves.toEqual({ kind: 'failed' })
    expect(isComposing.value).toBe(false)
  })
})
