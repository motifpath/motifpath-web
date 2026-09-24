import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Concept = components['schemas']['Concept']

export function useListConcepts() {
  const { items: concepts, isLoading, error, retry } = useApiList<Concept>((coreApi) => coreApi.GET('/concepts', {}))

  return { concepts, isLoading, error, retry }
}
