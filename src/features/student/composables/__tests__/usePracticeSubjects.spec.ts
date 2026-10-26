import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET } }),
}))

import { usePracticeSubjects } from '@/features/student/composables/usePracticeSubjects'

const GUITAR = '22222222-2222-4222-8222-222222222222'
const listFor = (instrumentId: string | null) => ({ instrument_id: instrumentId, groups: [] })

describe('usePracticeSubjects', () => {
  beforeEach(() => GET.mockReset())

  it('loads the subjects for the instrument in hand', async () => {
    GET.mockResolvedValueOnce({ data: listFor(GUITAR), response: { status: 200 } })

    const { list, isLoading } = usePracticeSubjects(() => GUITAR)
    expect(isLoading.value).toBe(true)
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/students/me/practice-subjects', { params: { query: { instrument_id: GUITAR } }, signal: expect.any(AbortSignal) })
    expect(list.value).toEqual(listFor(GUITAR))
    expect(isLoading.value).toBe(false)
  })

  it('loads the subjects for a session in the head with no instrument', async () => {
    GET.mockResolvedValueOnce({ data: listFor(null), response: { status: 200 } })

    usePracticeSubjects(() => null)
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/students/me/practice-subjects', { params: { query: {} }, signal: expect.any(AbortSignal) })
  })

  it('reloads when the instrument changes, and keeps only the latest answer', async () => {
    let answerGuitar: (value: unknown) => void = () => {}
    GET.mockReturnValueOnce(new Promise((resolve) => (answerGuitar = resolve)))
    GET.mockResolvedValueOnce({ data: listFor(null), response: { status: 200 } })
    const instrument = ref<string | null>(GUITAR)

    const { list } = usePracticeSubjects(() => instrument.value)
    instrument.value = null
    await nextTick()
    await flushPromises()
    answerGuitar({ data: listFor(GUITAR), response: { status: 200 } })
    await flushPromises()

    expect(list.value).toEqual(listFor(null))
  })

  it('waits while the instrument is not known yet, then loads once', async () => {
    GET.mockResolvedValue({ data: listFor(GUITAR), response: { status: 200 } })
    const instrument = ref<string | null | undefined>(undefined)

    const { list, isLoading } = usePracticeSubjects(() => instrument.value)
    await flushPromises()
    expect(GET).not.toHaveBeenCalled()
    expect(isLoading.value).toBe(true)
    expect(list.value).toBeNull()

    instrument.value = GUITAR
    await nextTick()
    await flushPromises()

    expect(GET).toHaveBeenCalledTimes(1)
    expect(list.value).toEqual(listFor(GUITAR))
  })

  it('cancels the request for an instrument no longer chosen', async () => {
    GET.mockReturnValueOnce(new Promise(() => {}))
    GET.mockResolvedValueOnce({ data: listFor(null), response: { status: 200 } })
    const instrument = ref<string | null>(GUITAR)

    usePracticeSubjects(() => instrument.value)
    const first: AbortSignal = GET.mock.calls[0][1].signal
    expect(first.aborted).toBe(false)
    instrument.value = null
    await nextTick()

    expect(first.aborted).toBe(true)
    expect(GET.mock.calls[1][1].signal.aborted).toBe(false)
  })

  it('cancels its request when the page goes away', () => {
    GET.mockReturnValueOnce(new Promise(() => {}))
    const scope = effectScope()

    scope.run(() => usePracticeSubjects(() => GUITAR))
    scope.stop()

    expect(GET.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('fails on an error or a network failure, and loads again on retry', async () => {
    GET.mockRejectedValueOnce(new TypeError('network'))
    GET.mockResolvedValueOnce({ data: listFor(GUITAR), response: { status: 200 } })

    const { list, error, retry } = usePracticeSubjects(() => GUITAR)
    await flushPromises()
    expect(error.value).toBe(true)
    expect(list.value).toBeNull()

    await retry()
    expect(error.value).toBe(false)
    expect(list.value).toEqual(listFor(GUITAR))
  })
})
