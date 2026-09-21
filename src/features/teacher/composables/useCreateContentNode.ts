import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateContentNodeRequest = components['schemas']['CreateContentNodeRequest']
type ContentNode = components['schemas']['ContentNode']

export function useCreateContentNode() {
  const createContentNode = useApiMutation<[CreateContentNodeRequest], ContentNode>(
    (coreApi, request) => coreApi.POST('/content-nodes', { body: request }),
    'Failed to create the content node',
  )

  return { createContentNode }
}
