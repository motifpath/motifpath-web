import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListContentNodeChallenges } from '@/features/teacher/composables/useListContentNodeChallenges'

describe('useListContentNodeChallenges', () => {
  it('loads the content node challenges on creation', async () => {
    const challenges = [{ challenge_id: 'ch-1' }]
    GET.mockResolvedValueOnce({ data: challenges, error: undefined, response: { status: 200 } })

    const { challenges: result, isLoading, error } = useListContentNodeChallenges('cn-1')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: 'cn-1' } },
    })
    expect(result.value).toEqual(challenges)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { challenges, isLoading, error } = useListContentNodeChallenges('cn-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(challenges.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
