import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useCatalogPath } from '@/features/student/composables/useCatalogPath'

describe('useCatalogPath', () => {
  beforeEach(() => GET.mockReset())

  it("loads a published path's detail", async () => {
    const detail = { learning_path_id: 'lp-1', title: 'Open chords', items: [] }
    GET.mockResolvedValueOnce({ data: detail, error: undefined, response: { status: 200 } })

    const { path, isLoading } = useCatalogPath('lp-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/catalog/paths/{learning_path_id}', {
      params: { path: { learning_path_id: 'lp-1' } },
    })
    expect(path.value).toEqual(detail)
  })

  it('reports a path that is not in the catalog as not found', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'nope' }, response: { status: 404 } })

    const { notFound, isLoading } = useCatalogPath('lp-draft')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(notFound.value).toBe(true)
  })
})
