import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useSkillTagSuggestions } from '@/features/teacher/composables/useSkillTagSuggestions'

describe('useSkillTagSuggestions', () => {
  beforeEach(() => {
    GET.mockReset()
  })

  it('does not fetch until ensureLoaded is called', () => {
    useSkillTagSuggestions()

    expect(GET).not.toHaveBeenCalled()
  })

  it('collects the distinct, sorted set of skill tags across every exercise once loaded', async () => {
    GET.mockResolvedValueOnce({
      data: [
        { exercise_id: 'e-1', skill_tags: ['rhythm', 'chord-recognition'] },
        { exercise_id: 'e-2', skill_tags: ['chord-recognition', 'ear-training'] },
        { exercise_id: 'e-3', skill_tags: undefined },
      ],
      error: undefined,
      response: { status: 200 },
    })

    const { availableTags, isLoading, ensureLoaded } = useSkillTagSuggestions()
    await ensureLoaded()

    expect(isLoading.value).toBe(false)
    expect(availableTags.value).toEqual(['chord-recognition', 'ear-training', 'rhythm'])
  })

  it('only fetches once even when ensureLoaded is called multiple times', async () => {
    GET.mockResolvedValueOnce({ data: [{ exercise_id: 'e-1', skill_tags: ['rhythm'] }], error: undefined, response: {} })

    const { ensureLoaded } = useSkillTagSuggestions()
    await ensureLoaded()
    await ensureLoaded()

    expect(GET).toHaveBeenCalledTimes(1)
  })

  it('is an empty list when the exercise list fails to load', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { availableTags, ensureLoaded } = useSkillTagSuggestions()
    await ensureLoaded()

    expect(availableTags.value).toEqual([])
  })
})
