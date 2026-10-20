import { describe, expect, it, vi } from 'vitest'

const PATCH = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PATCH }, eventApi: {} }),
}))

import { useUpdateDiagram } from '@/features/teacher/composables/useUpdateDiagram'

describe('useUpdateDiagram', () => {
  it('patches the diagram and returns the updated resource', async () => {
    const diagram = { diagram_id: 'd-1', names: { en: 'Renamed' } }
    PATCH.mockResolvedValueOnce({ data: diagram, error: undefined, response: { status: 200 } })

    const { updateDiagram } = useUpdateDiagram()
    const request = { names: { en: 'Renamed' } }

    const result = await updateDiagram('d-1', request)

    expect(PATCH).toHaveBeenCalledWith('/diagrams/{diagram_id}', {
      params: { path: { diagram_id: 'd-1' } },
      body: request,
    })
    expect(result).toEqual(diagram)
  })

  it('throws with the server error message when the update fails', async () => {
    PATCH.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 404 } })

    const { updateDiagram } = useUpdateDiagram()

    await expect(updateDiagram('missing', { names: { en: 'x' } })).rejects.toThrow('Boom')
  })
})
