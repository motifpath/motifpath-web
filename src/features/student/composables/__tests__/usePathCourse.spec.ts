import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { makeStudentPathItem as item, makeStudentPathView as view } from '@/features/student/testing/studentPathItem'

type StudentPathView = components['schemas']['StudentPathView']

const get = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({ useApi: () => ({ coreApi: { GET: get } }) }))

import { usePathCourse } from '@/features/student/composables/usePathCourse'

const enrollment = { course_enrollment_id: 'ce-1', course_title: 'Guitar from zero', checkpoint_count: 3 }

async function settle() {
  for (let i = 0; i < 3; i++) await nextTick()
}

describe('usePathCourse', () => {
  it('names the course and the part a course checkpoint is', async () => {
    get.mockResolvedValueOnce({ data: [enrollment] })
    const path = ref<StudentPathView | null>(view([item(1)], { course_enrollment_id: 'ce-1', course_checkpoint_position: 2 }))

    const course = usePathCourse(path)
    await settle()

    expect(get).toHaveBeenCalledWith('/students/me/course-enrollments', {})
    expect(course.value).toEqual({ title: 'Guitar from zero', part: 2, parts: 3 })
  })

  it('asks for nothing on a standalone path', async () => {
    get.mockClear()
    const course = usePathCourse(ref(view([item(1)])))
    await settle()

    expect(get).not.toHaveBeenCalled()
    expect(course.value).toBeNull()
  })

  it('leaves the eyebrow out when the enrollments fail to load', async () => {
    get.mockResolvedValueOnce({ error: { message: 'boom' } })
    const course = usePathCourse(ref(view([item(1)], { course_enrollment_id: 'ce-1', course_checkpoint_position: 2 })))
    await settle()

    expect(course.value).toBeNull()
  })
})
