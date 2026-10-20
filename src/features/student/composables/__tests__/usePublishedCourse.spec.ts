import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { usePublishedCourse } from '@/features/student/composables/usePublishedCourse'

describe('usePublishedCourse', () => {
  it('loads only the published course snapshot for a prospective learner', async () => {
    GET.mockResolvedValueOnce({
      data: { course_id: 'c-1', title: 'Fingerstyle journey' },
      response: new Response(null, { status: 200 }),
    })

    const { course, isLoading } = usePublishedCourse('c-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/courses/{course_id}/published', {
      params: { path: { course_id: 'c-1' } },
    })
    expect(course.value).toEqual({ course_id: 'c-1', title: 'Fingerstyle journey' })
  })
})
