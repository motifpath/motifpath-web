import { computed, ref, watch, type Ref } from 'vue'

import type { DiscoverSegment } from '@/features/student/composables/useDiscoverState'
import { type CatalogItem, courseItem, pathItem } from '@/features/student/utils/catalogItem'
import {
  type CatalogQuery,
  type DiscoverFilters,
  type DiscoverState,
  toCatalogQuery,
} from '@/features/student/utils/discoverQuery'
import { useApi } from '@/shared/composables/useApi'
import { type PageRequest, useApiPagedList } from '@/shared/composables/useApiPagedList'

type CoreApi = ReturnType<typeof useApi>['coreApi']

/** One page of a segment's catalog, as Discover lists it. */
async function fetchCatalog(coreApi: CoreApi, segment: DiscoverSegment, query: CatalogQuery & PageRequest) {
  if (segment === 'courses') {
    const { data, error } = await coreApi.GET('/catalog/courses', { params: { query } })
    return { data: data && { items: data.items.map(courseItem), total: data.total }, error }
  }
  const { data, error } = await coreApi.GET('/catalog/paths', { params: { query } })
  return { data: data && { items: data.items.map(pathItem), total: data.total }, error }
}

/**
 * The segment's catalog, 20 at a time, asked again whenever the segment, search or filters
 * change. When nothing matches, it also counts the other segment's matches, so the student can
 * be pointed there. It can also count what a draft of filters would show, with today's search.
 */
export function useDiscoverCatalog(segment: Ref<DiscoverSegment>, state: DiscoverState) {
  const { coreApi } = useApi()
  const query = computed(() => toCatalogQuery(state))

  const { items, reload, ...page } = useApiPagedList<CatalogItem>((api, pageRequest) =>
    fetchCatalog(api, segment.value, { ...pageRequest, ...query.value }),
  )

  const otherCount = ref<number | null>(null)
  let latestCount = 0

  async function countOther() {
    const request = ++latestCount
    otherCount.value = null
    if (page.isLoading.value || page.error.value || items.value.length > 0) return
    const other: DiscoverSegment = segment.value === 'courses' ? 'paths' : 'courses'
    const { data } = await fetchCatalog(coreApi, other, { limit: 1, offset: 0, ...query.value })
    if (request === latestCount) otherCount.value = data ? data.total : null
  }

  async function countMatches(filters: DiscoverFilters): Promise<number | null> {
    const draftQuery = toCatalogQuery({ q: state.q, filters })
    const { data, error } = await fetchCatalog(coreApi, segment.value, { limit: 1, offset: 0, ...draftQuery })
    return error || !data ? null : data.total
  }

  watch([segment, query], () => void reload(), { deep: true })
  watch([page.isLoading, items], () => void countOther())

  return { items, reload, otherCount, countMatches, ...page }
}
