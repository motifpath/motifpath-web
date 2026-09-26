import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListInstruments } from '@/shared/composables/useListInstruments'

describe('useListInstruments', () => {
  beforeEach(() => GET.mockReset())

  it('loads instruments on creation', async () => {
    const instruments = [{ instrument_id: 'i-1', name: 'Guitar', family: 'fretted', string_count: 6 }]
    GET.mockResolvedValueOnce({ data: instruments, error: undefined, response: { status: 200 } })

    const { instruments: result, isLoading, error } = useListInstruments()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/instruments', {})
    expect(result.value).toEqual(instruments)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { instruments, isLoading, error } = useListInstruments()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(instruments.value).toEqual([])
    expect(error.value).toBe(true)
  })
  it('shares one request between lists set up together, such as several controls on one page', async () => {
    const instruments = [{ instrument_id: 'i-1', names: { en: 'Guitar' }, languages: ['en'] }]
    GET.mockResolvedValue({ data: instruments, error: undefined, response: { status: 200 } })

    const first = useListInstruments()
    const second = useListInstruments()
    await vi.waitFor(() => expect(first.isLoading.value || second.isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledTimes(1)
    expect(first.instruments.value).toEqual(instruments)
    expect(second.instruments.value).toEqual(instruments)
  })

  it('asks again once the shared request has finished, so a later list is never stale', async () => {
    GET.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } })
    const first = useListInstruments()
    await vi.waitFor(() => expect(first.isLoading.value).toBe(false))

    const later = useListInstruments()
    await vi.waitFor(() => expect(later.isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledTimes(2)
  })
})
