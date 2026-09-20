import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CreateConceptRequest = components['schemas']['CreateConceptRequest']
type Concept = components['schemas']['Concept']

export function useCreateConcept() {
  const { coreApi } = useApi()

  async function createConcept(request: CreateConceptRequest): Promise<Concept> {
    const { data, error } = await coreApi.POST('/concepts', { body: request })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to create the concept'))
    }
    return data
  }

  return { createConcept }
}
