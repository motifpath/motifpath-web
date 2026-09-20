import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateSkill } from '@/features/teacher/composables/useCreateSkill'

describe('useCreateSkill', () => {
  it('posts the request and returns the created skill', async () => {
    const skill = { skill_id: 's-1', name: 'triad-shapes', parent_id: null }
    POST.mockResolvedValueOnce({ data: skill, error: undefined, response: { status: 201 } })

    const { createSkill } = useCreateSkill()
    const result = await createSkill({ name: 'triad-shapes' })

    expect(POST).toHaveBeenCalledWith('/skills', { body: { name: 'triad-shapes' } })
    expect(result).toEqual(skill)
  })

  it('includes parent_id when creating a child skill', async () => {
    const skill = { skill_id: 's-2', name: 'major-triads', parent_id: 's-1' }
    POST.mockResolvedValueOnce({ data: skill, error: undefined, response: { status: 201 } })

    const { createSkill } = useCreateSkill()
    await createSkill({ name: 'major-triads', parent_id: 's-1' })

    expect(POST).toHaveBeenCalledWith('/skills', { body: { name: 'major-triads', parent_id: 's-1' } })
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createSkill } = useCreateSkill()

    await expect(createSkill({ name: 't' })).rejects.toThrow('Boom')
  })
})
