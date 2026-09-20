import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateConcept } from '@/features/teacher/composables/useCreateConcept'

describe('useCreateConcept', () => {
  it('posts the request and returns the created concept', async () => {
    const concept = { concept_id: 'c-1', name: 'chord-theory', parent_id: null }
    POST.mockResolvedValueOnce({ data: concept, error: undefined, response: { status: 201 } })

    const { createConcept } = useCreateConcept()
    const result = await createConcept({ name: 'chord-theory' })

    expect(POST).toHaveBeenCalledWith('/concepts', { body: { name: 'chord-theory' } })
    expect(result).toEqual(concept)
  })

  it('includes parent_id when creating a child concept', async () => {
    const concept = { concept_id: 'c-2', name: 'interval-recognition', parent_id: 'c-1' }
    POST.mockResolvedValueOnce({ data: concept, error: undefined, response: { status: 201 } })

    const { createConcept } = useCreateConcept()
    await createConcept({ name: 'interval-recognition', parent_id: 'c-1' })

    expect(POST).toHaveBeenCalledWith('/concepts', { body: { name: 'interval-recognition', parent_id: 'c-1' } })
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createConcept } = useCreateConcept()

    await expect(createConcept({ name: 't' })).rejects.toThrow('Boom')
  })
})
