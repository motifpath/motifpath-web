import { computed } from 'vue'

import type { CourseListFilterState } from '@/shared/composables/useCourseListFilters'
import { useCurrentUserStore } from '@/stores/currentUser'

/**
 * An "only mine" toggle over a list's author filter. No endpoint lists the
 * learning path library's authors, so the author filter narrows to the
 * signed-in user's own paths or none.
 */
export function useOnlyMineFilter(filters: Pick<CourseListFilterState, 'teacher'>) {
  const currentUser = useCurrentUserStore()

  const onlyMine = computed({
    get: () => !!currentUser.profile && filters.teacher?.user_id === currentUser.profile.user_id,
    set: (checked: boolean) => {
      const profile = currentUser.profile
      filters.teacher =
        checked && profile ? { user_id: profile.user_id, display_name: profile.display_name } : null
    },
  })

  function onOnlyMineChange(event: Event) {
    if (event.target instanceof HTMLInputElement) onlyMine.value = event.target.checked
  }

  return { onlyMine, onOnlyMineChange }
}
