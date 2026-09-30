import { nextTick, ref, watch, type Ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import {
  type CatalogKind,
  type CatalogReturn,
  restoreCatalogReturn,
  saveCatalogReturn,
} from '@/features/student/utils/catalogReturn'
import type {
  CourseListFilterInitialState,
  CourseListFilterState,
} from '@/shared/composables/useCourseListFilters'

export interface CatalogReturnOptions {
  kind: CatalogKind
  /** The route name of an item's detail page. */
  detailRoute: string
  /** The detail route's param naming the item. */
  idParam: string
  /** The query key the detail page's Back link names the item with. */
  returnQuery: string
}

/** The catalog list state a return journey reads and replays. */
export interface CatalogListState {
  itemCount: Ref<number>
  total: Ref<number>
  isLoading: Ref<boolean>
  isLoadingMore: Ref<boolean>
  error: Ref<boolean>
  loadMoreError: Ref<boolean>
  loadMore: () => Promise<void> | void
  filters: CourseListFilterState
  searchText: Ref<string>
}

/**
 * Keeps a learner's place in a catalog across a visit to one item's details:
 * the filters, the search, how many cards were loaded and the scroll
 * position. Call it before creating the catalog list, start the list from
 * `initialState`, then hand the list to `resume`.
 */
export function useCatalogReturn(options: CatalogReturnOptions) {
  const route = useRoute()
  const router = useRouter()

  // The item whose details the learner is coming back from: named by the
  // details page's Back link, or, after the browser's Back button, found in
  // this history entry's record of the page that followed it.
  function returningItemId(): string | null {
    const fromLink = route.query[options.returnQuery]
    if (typeof fromLink === 'string') return fromLink
    const state: unknown = window.history.state
    if (!state || typeof state !== 'object' || !('forward' in state) || typeof state.forward !== 'string') return null
    const next = router.resolve(state.forward)
    const id = next.params[options.idParam]
    return next.name === options.detailRoute && typeof id === 'string' ? id : null
  }

  const returnedFromId = returningItemId()
  const restored = returnedFromId ? restoreCatalogReturn(options.kind, returnedFromId) : null
  const initialState: CourseListFilterInitialState | undefined = restored
    ? { ...restored.filters, searchText: restored.searchText }
    : undefined

  function resume(list: CatalogListState) {
    const pending = ref<Omit<CatalogReturn, 'itemId'> | null>(restored)
    watch(
      [list.itemCount, list.total, list.isLoading, list.isLoadingMore, list.error, list.loadMoreError],
      () => {
        const returnState = pending.value
        if (!returnState || list.isLoading.value || list.isLoadingMore.value) return
        if (list.error.value) {
          pending.value = null
          return
        }

        // A page that fails to load is not retried here: the learner goes back
        // to their place among the cards that did load, and Load more offers
        // the rest.
        const loadedTarget = Math.min(returnState.loadedCount, list.total.value)
        if (list.itemCount.value < loadedTarget && !list.loadMoreError.value) {
          void list.loadMore()
          return
        }

        pending.value = null
        void nextTick(() => window.scrollTo(0, returnState.scrollY))
      },
      { immediate: true },
    )

    onBeforeRouteLeave((to) => {
      const id = to.params[options.idParam]
      if (to.name !== options.detailRoute || typeof id !== 'string') return

      const { filters } = list
      saveCatalogReturn(options.kind, {
        itemId: id,
        filters: {
          levels: [...filters.levels],
          skillIds: [...filters.skillIds],
          conceptIds: [...filters.conceptIds],
          teacher: filters.teacher ? { ...filters.teacher } : null,
          instrumentId: filters.instrumentId,
          language: filters.language,
        },
        searchText: list.searchText.value,
        loadedCount: list.itemCount.value,
        scrollY: window.scrollY,
      })
    })
  }

  return { initialState, resume }
}
