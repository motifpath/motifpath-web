import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'

describe('useMyStandalonePaths', () => {
  beforeEach(() => GET.mockReset())

  it("loads the student's standalone paths", async () => {
    const paths = [{ student_path_id: 'sp-1', title: 'Open chords' }]
    GET.mockResolvedValueOnce({ data: paths, error: undefined, response: { status: 200 } })

    const { paths: result, isLoading } = useMyStandalonePaths()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/students/me/student-paths', {})
    expect(result.value).toEqual(paths)
  })

  it('reports a failed load', async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'boom' },
      response: { status: 500 },
    })

    const { paths, error, isLoading } = useMyStandalonePaths()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(error.value).toBe(true)
    expect(paths.value).toEqual([])
  })
})
