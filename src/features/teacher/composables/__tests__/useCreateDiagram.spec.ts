import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateDiagram } from '@/features/teacher/composables/useCreateDiagram'
import type { components } from '@/api/generated/core-domain'

type CreateDiagramRequest = components['schemas']['CreateDiagramRequest']

describe('useCreateDiagram', () => {
  it('posts the request and returns the created diagram', async () => {
    const diagram = { diagram_id: 'd-1', names: { en: 'Minor Pentatonic' } }
    POST.mockResolvedValueOnce({ data: diagram, error: undefined, response: { status: 201 } })

    const { createDiagram } = useCreateDiagram()
    const request: CreateDiagramRequest = {
      instrument_id: 'i-1',
      names: { en: 'Minor Pentatonic' },
      kind: 'custom',
      positions: [],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    }

    const result = await createDiagram(request)

    expect(POST).toHaveBeenCalledWith('/diagrams', { body: request })
    expect(result).toEqual(diagram)
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createDiagram } = useCreateDiagram()

    await expect(
      createDiagram({ instrument_id: 'i-1', names: { en: '' }, kind: 'custom', positions: [], classification: { skill_ids: [], concept_ids: [] } }),
    ).rejects.toThrow('Boom')
  })
})
