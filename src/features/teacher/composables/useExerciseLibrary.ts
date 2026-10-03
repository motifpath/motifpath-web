import { computed, ref, watch } from 'vue'

import { type ExerciseFilterQuery, useListExercises } from '@/features/teacher/composables/useListExercises'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'

export type ExerciseType = NonNullable<ExerciseFilterQuery['exercise_type']>

/**
 * The exercise pool for authoring, one page at a time: narrowed server-side
 * by title, type, skill, concept, language, creator and instrument (an
 * instrument also keeps the exercises for every instrument). The pool filters by
 * a single skill and a single concept, so only the first pick of each is
 * sent.
 */
export function useExerciseLibrary() {
  const { filters, searchText, query, hasActiveFilters: hasSharedFilters, clearFilters: clearShared } =
    useCourseListFilters()
  const exerciseType = ref<ExerciseType | null>(null)

  const exerciseQuery = computed<ExerciseFilterQuery>(() => {
    const { q, skill_ids, concept_ids, created_by, language, instrument_id } = query.value
    return {
      ...(q ? { q } : {}),
      ...(exerciseType.value ? { exercise_type: exerciseType.value } : {}),
      ...(skill_ids?.[0] ? { skill_id: skill_ids[0] } : {}),
      ...(concept_ids?.[0] ? { concept_id: concept_ids[0] } : {}),
      ...(language ? { language } : {}),
      ...(created_by ? { created_by } : {}),
      ...(instrument_id ? { instrument_id: [instrument_id] } : {}),
    }
  })

  const { exercises, retry, ...page } = useListExercises({ filters: () => exerciseQuery.value })
  watch(exerciseQuery, () => void retry(), { deep: true })

  const hasActiveFilters = computed(() => hasSharedFilters.value || exerciseType.value !== null)

  function clearFilters() {
    clearShared()
    exerciseType.value = null
  }

  return { exercises, filters, searchText, exerciseType, hasActiveFilters, clearFilters, retry, ...page }
}
