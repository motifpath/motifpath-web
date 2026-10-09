import { ref, watch } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/** `no-path` — student has no active assignment (404). `load-failed` — anything else. */
export type StudentPathError = 'no-path' | 'load-failed'

/**
 * The student's current path. Which steps are locked for language depends on the student's
 * locale, so the path reloads whenever the server confirms a new one — in the background,
 * keeping the path on screen instead of going back to a skeleton.
 */
export function useStudentPath() {
  const { coreApi } = useApi()
  const currentUser = useCurrentUserStore()

  const data = ref<StudentPathView | null>(null)
  const error = ref<StudentPathError | null>(null)
  const isLoading = ref(false)

  // Only the latest request may write: a reload started by a locale change must not be
  // overwritten by a slower earlier one.
  let epoch = 0

  async function load({ quiet = false } = {}) {
    const myEpoch = ++epoch
    if (!quiet) isLoading.value = true
    error.value = null

    const result = await coreApi.GET('/students/me/path')
    if (myEpoch !== epoch) return

    if (result.error || !result.data) {
      error.value = result.response?.status === 404 ? 'no-path' : 'load-failed'
      data.value = null
    } else {
      data.value = result.data
    }

    isLoading.value = false
  }

  watch(
    () => currentUser.profile?.locale.code,
    (code, previous) => {
      if (code && previous && code !== previous) void load({ quiet: true })
    },
  )

  void load()

  return { data, error, isLoading, retry: () => load() }
}
