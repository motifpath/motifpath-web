import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CreateContentNodeRequest = components['schemas']['CreateContentNodeRequest']
type ContentNode = components['schemas']['ContentNode']

export function useCreateContentNode() {
  const { coreApi } = useApi()

  async function createContentNode(request: CreateContentNodeRequest): Promise<ContentNode> {
    const { data, error } = await coreApi.POST('/content-nodes', { body: request })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to create the content node'))
    }
    return data
  }

  return { createContentNode }
}
