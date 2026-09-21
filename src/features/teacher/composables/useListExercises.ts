import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

export function useListExercises() {
  const { items: exercises, isLoading, error, retry } = useApiList<Exercise>((coreApi) => coreApi.GET('/exercises', {}))

  return { exercises, isLoading, error, retry }
}
