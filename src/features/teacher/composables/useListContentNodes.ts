import { ref, watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

/**
 * The content library, a page at a time. Setting `instrumentId` narrows it
 * to content for that instrument, plus content for every instrument.
 */
export function useListContentNodes(options: { loadAll?: boolean } = {}) {
  const instrumentId = ref<string | null>(null)

  const { items: contentNodes, reload: retry, ...rest } = useApiPagedList<ContentNode>(
    (coreApi, page) =>
      coreApi.GET('/content-nodes', {
        params: { query: { ...page, ...(instrumentId.value ? { instrument_id: instrumentId.value } : {}) } },
      }),
    options,
  )

  watch(instrumentId, () => void retry())

  return { contentNodes, instrumentId, retry, ...rest }
}
