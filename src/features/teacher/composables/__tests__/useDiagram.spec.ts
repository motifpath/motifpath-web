import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useDiagram } from '@/features/teacher/composables/useDiagram'

describe('useDiagram', () => {
  it('loads the diagram by id on creation', async () => {
    const diagram = { diagram_id: 'd-1', name: 'Minor Pentatonic' }
    GET.mockResolvedValueOnce({ data: diagram, error: undefined, response: { status: 200 } })

    const { diagram: result, isLoading, error } = useDiagram('d-1')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/diagrams/{diagram_id}', { params: { path: { diagram_id: 'd-1' } } })
    expect(result.value).toEqual(diagram)
    expect(error.value).toBe(false)
  })

  it('sets error and a null diagram when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 404 } })

    const { diagram, isLoading, error } = useDiagram('missing')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(diagram.value).toBeNull()
    expect(error.value).toBe(true)
  })
})
