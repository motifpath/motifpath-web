import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/**
 * The parts of one of the student's course enrollments, in course order, at the version they took:
 * what a finished course lists for review. Loads nothing while there is no enrollment, and again
 * whenever it changes. Only the latest load applies its result.
 */
export function useEnrollmentParts(enrollmentId: MaybeRefOrGetter<string | null>) {
  const { coreApi } = useApi()

  const parts = ref<StudentPathView[]>([])
  const isLoading = ref(false)
  const error = ref(false)
  let loadEpoch = 0

  async function load(): Promise<void> {
    const id = toValue(enrollmentId)
    const myEpoch = ++loadEpoch
    parts.value = []
    error.value = false
    if (!id) {
      isLoading.value = false
      return
    }

    isLoading.value = true
    const result = await coreApi.GET('/students/me/course-enrollments/{course_enrollment_id}/parts', {
      params: { path: { course_enrollment_id: id } },
    })
    if (myEpoch !== loadEpoch) return
    isLoading.value = false
    if (result.error || !result.data) {
      error.value = true
      return
    }
    parts.value = result.data
  }

  watch(() => toValue(enrollmentId), () => void load(), { immediate: true })

  return { parts, isLoading, error, retry: load }
}
