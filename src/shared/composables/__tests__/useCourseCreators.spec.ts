import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useCourseCreators } from '@/shared/composables/useCourseCreators'

const bob = { user_id: 'u-bob', display_name: 'Bob Martins' }
const carol = { user_id: 'u-carol', display_name: 'Carol Dias' }

function ok(items: unknown[]) {
  return { data: items, error: undefined, response: { status: 200 } }
}

describe('useCourseCreators', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads every visible course creator, in the order the server gives', async () => {
    GET.mockResolvedValueOnce(ok([bob, carol]))

    const { creators, isLoading } = useCourseCreators()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/catalog/creators', { params: { query: {} } })
    expect(creators.value).toEqual([bob, carol])
  })

  it('waits for typing to pause, then asks the server for creators matching the trimmed name', async () => {
    vi.useFakeTimers()
    const { nameQuery } = useCourseCreators()
    await vi.runAllTimersAsync()
    GET.mockClear()

    nameQuery.value = 'di'
    await nextTick()
    nameQuery.value = ' dias '
    await nextTick()
    expect(GET).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(GET).toHaveBeenCalledTimes(1)
    expect(GET).toHaveBeenCalledWith('/catalog/creators', { params: { query: { q: 'dias' } } })
  })

  it('drops the name filter once the query is emptied', async () => {
    vi.useFakeTimers()
    const { nameQuery } = useCourseCreators()
    nameQuery.value = 'dias'
    await vi.runAllTimersAsync()

    nameQuery.value = '   '
    await vi.runAllTimersAsync()

    expect(GET).toHaveBeenLastCalledWith('/catalog/creators', { params: { query: {} } })
  })

  it('keeps the latest search when an earlier one answers last', async () => {
    vi.useFakeTimers()
    let answerFirst: (value: unknown) => void = () => {}
    GET.mockResolvedValueOnce(ok([])) // initial load
    GET.mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
    GET.mockResolvedValueOnce(ok([carol]))
    const { creators, nameQuery } = useCourseCreators()
    await vi.runAllTimersAsync()

    nameQuery.value = 'b'
    await vi.runAllTimersAsync()
    nameQuery.value = 'carol'
    await vi.runAllTimersAsync()
    answerFirst(ok([bob]))
    await vi.runAllTimersAsync()

    expect(creators.value).toEqual([carol])
  })

  it("lists the creators of the caller's managed courses in the managed scope", async () => {
    const { isLoading } = useCourseCreators('managed')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/courses/creators', { params: { query: {} } })
  })

  it('reports a failed load and retries it', async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'boom' },
      response: { status: 500 },
    })
    const { creators, error, isLoading, retry } = useCourseCreators()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value).toBe(true)
    expect(creators.value).toEqual([])

    GET.mockResolvedValueOnce(ok([bob]))
    await retry()

    expect(error.value).toBe(false)
    expect(creators.value).toEqual([bob])
  })
})
