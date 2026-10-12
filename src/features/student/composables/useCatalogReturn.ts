import { nextTick, ref, watch, type Ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter, type LocationQuery } from 'vue-router'

import type { DiscoverSegment } from '@/features/student/composables/useDiscoverState'
import { type CatalogQuery, restoreCatalogReturn, saveCatalogReturn } from '@/features/student/utils/catalogReturn'

/** Where each segment's items open, and the query key a detail's Back link names the item with. */
export const CATALOG_DETAIL = {
  courses: { route: 'course-detail', idParam: 'courseId', returnQuery: 'returnFromCourse' },
  paths: { route: 'path-detail', idParam: 'learningPathId', returnQuery: 'returnFromPath' },
} as const

/** The list state a return journey reads and replays. */
export interface CatalogListState {
  itemCount: Ref<number>
  total: Ref<number>
  isLoading: Ref<boolean>
  isLoadingMore: Ref<boolean>
  error: Ref<boolean>
  loadMoreError: Ref<boolean>
  loadMore: () => Promise<void> | void
}

function onlyStrings(query: LocationQuery): CatalogQuery {
  const kept: CatalogQuery = {}
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') kept[key] = value
    else if (Array.isArray(value)) kept[key] = value.filter((v): v is string => typeof v === 'string')
  }
  return kept
}

/**
 * Keeps a student's place in Discover across a visit to one item's details: how many items were
 * loaded and how far down the page was. The search and filters live in the address, which is
 * saved too, for the detail's way back. Call it before Discover's state tidies the address.
 */
export function useCatalogReturn(segment: Ref<DiscoverSegment>) {
  const route = useRoute()
  const router = useRouter()
  const detail = CATALOG_DETAIL[segment.value]

  // The item whose details the student is coming back from: named by the details page's Back
  // link, or, after the browser's Back button, found in this history entry's record of the page
  // that followed it.
  function returningItemId(): string | null {
    const fromLink = route.query[detail.returnQuery]
    if (typeof fromLink === 'string') return fromLink
    const state: unknown = window.history.state
    if (!state || typeof state !== 'object' || !('forward' in state) || typeof state.forward !== 'string') return null
    const next = router.resolve(state.forward)
    const id = next.params[detail.idParam]
    return next.name === detail.route && typeof id === 'string' ? id : null
  }

  const returnedFromId = returningItemId()
  const restored = returnedFromId ? restoreCatalogReturn(segment.value, returnedFromId) : null

  function resume(list: CatalogListState) {
    const pending = ref(restored)
    watch(
      [list.itemCount, list.total, list.isLoading, list.isLoadingMore, list.error, list.loadMoreError],
      () => {
        const place = pending.value
        if (!place || list.isLoading.value || list.isLoadingMore.value) return
        if (list.error.value) {
          pending.value = null
          return
        }

        // A page that fails to load is not retried here: the student goes back to their place
        // among the items that did load, and the end of the list offers the rest.
        const loadedTarget = Math.min(place.loadedCount, list.total.value)
        if (list.itemCount.value < loadedTarget && !list.loadMoreError.value) {
          void list.loadMore()
          return
        }

        pending.value = null
        void nextTick(() => window.scrollTo(0, place.scrollY))
      },
      { immediate: true },
    )

    onBeforeRouteLeave((to) => {
      const opened = to.name === CATALOG_DETAIL.courses.route ? 'courses' : to.name === CATALOG_DETAIL.paths.route ? 'paths' : null
      if (!opened) return
      const id = to.params[CATALOG_DETAIL[opened].idParam]
      if (typeof id !== 'string') return
      saveCatalogReturn(opened, {
        itemId: id,
        query: onlyStrings(route.query),
        loadedCount: list.itemCount.value,
        scrollY: window.scrollY,
      })
    })
  }

  return { resume }
}
