import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateDiagramRequest = components['schemas']['CreateDiagramRequest']
type Diagram = components['schemas']['Diagram']

export function useCreateDiagram() {
  const createDiagram = useApiMutation<[CreateDiagramRequest], Diagram>(
    (coreApi, request) => coreApi.POST('/diagrams', { body: request }),
    'Failed to create the diagram',
  )

  return { createDiagram }
}
