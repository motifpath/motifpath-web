import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/** `no-path` — student has no active assignment (404). `load-failed` — anything else. */
export type StudentPathError = 'no-path' | 'load-failed'

export function useStudentPath() {
  const { coreApi } = useApi()

  const data = ref<StudentPathView | null>(null)
  const error = ref<StudentPathError | null>(null)
  const isLoading = ref(false)

  async function load() {
    isLoading.value = true
    error.value = null

    const result = await coreApi.GET('/students/me/path')

    if (result.error || !result.data) {
      error.value = result.response?.status === 404 ? 'no-path' : 'load-failed'
      data.value = null
    } else {
      data.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { data, error, isLoading, retry: load }
}
