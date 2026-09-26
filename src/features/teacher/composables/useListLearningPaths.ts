import { ref, watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

/**
 * The learning path library, a page at a time. Setting `instrumentId`
 * narrows it to paths for that instrument, plus paths for every instrument.
 */
export function useListLearningPaths(options: { loadAll?: boolean } = {}) {
  const instrumentId = ref<string | null>(null)

  const { items: learningPaths, reload: retry, ...rest } = useApiPagedList<LearningPath>(
    (coreApi, page) =>
      coreApi.GET('/learning-paths', {
        params: { query: { ...page, ...(instrumentId.value ? { instrument_id: instrumentId.value } : {}) } },
      }),
    options,
  )

  watch(instrumentId, () => void retry())

  return { learningPaths, instrumentId, retry, ...rest }
}
