import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateConceptRequest = components['schemas']['CreateConceptRequest']
type Concept = components['schemas']['Concept']

export function useCreateConcept() {
  const createConcept = useApiMutation<[CreateConceptRequest], Concept>(
    (coreApi, request) => coreApi.POST('/concepts', { body: request }),
    'Failed to create the concept',
  )

  return { createConcept }
}
