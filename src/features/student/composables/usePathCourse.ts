import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

export interface PathCourse {
  title: string
  part: number
  parts: number
}

/**
 * The course a path is a part of, and which part, for the eyebrow above the path title. Null for a
 * standalone path, and while (or if) the course can't be loaded: the eyebrow is extra, so its
 * failure never blocks the path.
 */
export function usePathCourse(path: MaybeRefOrGetter<StudentPathView | null>): Ref<PathCourse | null> {
  const { coreApi } = useApi()
  const course = ref<PathCourse | null>(null)
  let epoch = 0

  async function load(enrollmentId: string, part: number) {
    const myEpoch = ++epoch
    const result = await coreApi.GET('/students/me/course-enrollments', {})
    if (myEpoch !== epoch) return
    const enrollment = result.data?.find((candidate) => candidate.course_enrollment_id === enrollmentId)
    course.value = enrollment ? { title: enrollment.course_title, part, parts: enrollment.checkpoint_count } : null
  }

  watch(
    () => {
      const view = toValue(path)
      return [view?.course_enrollment_id ?? null, view?.course_checkpoint_position ?? null] as const
    },
    ([enrollmentId, part], previous) => {
      if (previous && previous[0] === enrollmentId && previous[1] === part) return
      if (!enrollmentId || !part) {
        epoch++
        course.value = null
        return
      }
      void load(enrollmentId, part)
    },
    { immediate: true },
  )

  return course
}
