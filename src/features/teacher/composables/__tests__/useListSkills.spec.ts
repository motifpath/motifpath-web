import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListSkills } from '@/features/teacher/composables/useListSkills'

describe('useListSkills', () => {
  it('loads skills on creation', async () => {
    const skills = [{ skill_id: 's-1', name: 'triad-shapes', parent_id: null }]
    GET.mockResolvedValueOnce({ data: skills, error: undefined, response: { status: 200 } })

    const { skills: result, isLoading, error } = useListSkills()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/skills', {})
    expect(result.value).toEqual(skills)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { skills, isLoading, error } = useListSkills()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(skills.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
