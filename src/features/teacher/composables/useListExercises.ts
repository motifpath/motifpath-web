import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components, operations } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']
/** GET /exercises' filters; an absent one means no filter. */
export type ExerciseFilterQuery = Omit<NonNullable<operations['listExercises']['parameters']['query']>, 'limit' | 'offset'>

/**
 * One page at a time of the exercise pool. `filters` is read on every
 * request, so after changing what it returns call `retry` to start over
 * from the first page.
 */
export function useListExercises(
  options: { loadAll?: boolean; filters?: () => ExerciseFilterQuery } = {},
) {
  const { filters = () => ({}), ...pageOptions } = options
  const { items: exercises, reload: retry, ...rest } = useApiPagedList<Exercise>(
    (coreApi, page) => coreApi.GET('/exercises', { params: { query: { ...page, ...filters() } } }),
    pageOptions,
  )

  return { exercises, retry, ...rest }
}
