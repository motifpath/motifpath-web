import { computed, type ComputedRef } from 'vue'

import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'

export type FirstRunStatus = 'loading' | 'first-run' | 'returning' | 'failed'

/**
 * Whether the home is the first run: true for a student who has never started a course or a path.
 * Both lists hold everything ever started — abandoned courses and archived paths too — so a student
 * who has left everything is not a new one. There is no "seen" flag: the first run shows until
 * something is started.
 */
export function useFirstRun(): { status: ComputedRef<FirstRunStatus>; retry: () => Promise<void> } {
  const enrollments = useMyCourseEnrollments()
  const paths = useMyStandalonePaths()

  const status = computed<FirstRunStatus>(() => {
    if (enrollments.isLoading.value || paths.isLoading.value) return 'loading'
    if (enrollments.error.value || paths.error.value) return 'failed'
    return enrollments.enrollments.value.length === 0 && paths.paths.value.length === 0 ? 'first-run' : 'returning'
  })

  async function retry() {
    await Promise.all([enrollments.retry(), paths.retry()])
  }

  return { status, retry }
}
