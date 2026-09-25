import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListContentNodeVersions } from '@/features/teacher/composables/useListContentNodeVersions'

describe('useListContentNodeVersions', () => {
  it('loads the content node version history on creation', async () => {
    const versions = [{ version_number: 2 }, { version_number: 1 }]
    GET.mockResolvedValueOnce({ data: versions, error: undefined, response: { status: 200 } })

    const { versions: result, isLoading, error } = useListContentNodeVersions('cn-1')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}/versions', {
      params: { path: { content_node_id: 'cn-1' } },
    })
    expect(result.value).toEqual(versions)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { versions, isLoading, error } = useListContentNodeVersions('cn-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(versions.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
