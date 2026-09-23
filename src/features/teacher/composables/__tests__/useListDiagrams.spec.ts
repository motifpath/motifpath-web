import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListDiagrams } from '@/features/teacher/composables/useListDiagrams'

describe('useListDiagrams', () => {
  it('loads diagrams on creation with no filters', async () => {
    const diagrams = [{ diagram_id: 'd-1', instrument_id: 'i-1', name: 'Minor Pentatonic' }]
    GET.mockResolvedValueOnce({ data: diagrams, error: undefined, response: { status: 200 } })

    const { diagrams: result, isLoading, error } = useListDiagrams()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/diagrams', { params: { query: {} } })
    expect(result.value).toEqual(diagrams)
    expect(error.value).toBe(false)
  })

  it('passes instrument/skill/concept filters through as query params', async () => {
    GET.mockResolvedValueOnce({ data: [], error: undefined, response: { status: 200 } })

    useListDiagrams({ instrumentId: 'i-1', skillId: 's-1', conceptId: 'c-1' })
    await vi.waitFor(() => expect(GET).toHaveBeenCalled())

    expect(GET).toHaveBeenCalledWith('/diagrams', {
      params: { query: { instrument_id: 'i-1', skill_id: 's-1', concept_id: 'c-1' } },
    })
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { diagrams, isLoading, error } = useListDiagrams()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(diagrams.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
