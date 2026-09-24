import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListConcepts } from '@/shared/composables/useListConcepts'

describe('useListConcepts', () => {
  it('loads concepts on creation', async () => {
    const concepts = [{ concept_id: 'c-1', name: 'chord-theory', parent_id: null }]
    GET.mockResolvedValueOnce({ data: concepts, error: undefined, response: { status: 200 } })

    const { concepts: result, isLoading, error } = useListConcepts()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/concepts', {})
    expect(result.value).toEqual(concepts)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { concepts, isLoading, error } = useListConcepts()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(concepts.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
