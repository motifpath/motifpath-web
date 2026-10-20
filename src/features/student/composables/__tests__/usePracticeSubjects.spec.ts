import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

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

    expect(GET).toHaveBeenCalledWith('/students/me/practice-subjects', { params: { query: { instrument_id: GUITAR } } })
    expect(list.value).toEqual(listFor(GUITAR))
    expect(isLoading.value).toBe(false)
  })

  it('loads the subjects for a session in the head with no instrument', async () => {
    GET.mockResolvedValueOnce({ data: listFor(null), response: { status: 200 } })

    usePracticeSubjects(() => null)
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/students/me/practice-subjects', { params: { query: {} } })
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
