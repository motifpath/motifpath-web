import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListInstruments } from '@/features/teacher/composables/useListInstruments'

describe('useListInstruments', () => {
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
})
