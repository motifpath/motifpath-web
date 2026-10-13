import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/**
 * One path the student holds, with each lesson's progress: what a finished standalone path lists for
 * review. Loads nothing while there is no path, and again whenever it changes. Only the latest load
 * applies its result.
 */
export function useHeldStudentPath(studentPathId: MaybeRefOrGetter<string | null>) {
  const { coreApi } = useApi()

  const view = ref<StudentPathView | null>(null)
  const isLoading = ref(false)
  const error = ref(false)
  let loadEpoch = 0

  async function load(): Promise<void> {
    const id = toValue(studentPathId)
    const myEpoch = ++loadEpoch
    view.value = null
    error.value = false
    if (!id) {
      isLoading.value = false
      return
    }

    isLoading.value = true
    const result = await coreApi.GET('/students/me/student-paths/{student_path_id}', {
      params: { path: { student_path_id: id } },
    })
    if (myEpoch !== loadEpoch) return
    isLoading.value = false
    if (result.error || !result.data) {
      error.value = true
      return
    }
    view.value = result.data
  }

  watch(() => toValue(studentPathId), () => void load(), { immediate: true })

  return { view, isLoading, error, retry: load }
}
