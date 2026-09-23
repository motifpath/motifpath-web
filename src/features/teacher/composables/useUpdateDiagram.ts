import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type UpdateDiagramRequest = components['schemas']['UpdateDiagramRequest']
type Diagram = components['schemas']['Diagram']

export function useUpdateDiagram() {
  const updateDiagram = useApiMutation<[string, UpdateDiagramRequest], Diagram>(
    (coreApi, diagramId, request) =>
      coreApi.PATCH('/diagrams/{diagram_id}', {
        params: { path: { diagram_id: diagramId } },
        body: request,
      }),
    'Failed to update the diagram',
  )

  return { updateDiagram }
}
