import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Replaces the current screen with the course-completed one as soon as a
 * just-completed enrollment is known. `replace`, not `push`: the screen being
 * left has no current path to return to.
 */
export function useCourseCompletionRedirect(completedEnrollmentId: MaybeRefOrGetter<string | null>) {
  const router = useRouter()

  watch(
    () => toValue(completedEnrollmentId),
    (enrollmentId) => {
      if (enrollmentId) void router.replace({ name: 'course-completed', params: { enrollmentId } })
    },
    { immediate: true },
  )
}
