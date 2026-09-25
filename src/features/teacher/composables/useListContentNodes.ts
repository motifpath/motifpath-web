import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

export function useListContentNodes(options: { loadAll?: boolean } = {}) {
  const { items: contentNodes, reload: retry, ...rest } = useApiPagedList<ContentNode>(
    (coreApi, page) => coreApi.GET('/content-nodes', { params: { query: page } }),
    options,
  )

  return { contentNodes, retry, ...rest }
}
