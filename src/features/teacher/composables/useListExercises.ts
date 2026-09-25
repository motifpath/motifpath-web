import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

export function useListExercises(options: { loadAll?: boolean } = {}) {
  const { items: exercises, reload: retry, ...rest } = useApiPagedList<Exercise>(
    (coreApi, page) => coreApi.GET('/exercises', { params: { query: page } }),
    options,
  )

  return { exercises, retry, ...rest }
}
