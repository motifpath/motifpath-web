import { nextTick, type Ref, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import type { AuthoringSection } from '@/features/teacher/utils/authoringListQuery'

/** What the list needs to give back its place. */
export interface ReturnableList {
  itemCount: Ref<number>
  total: Ref<number>
  isLoading: Ref<boolean>
  isLoadingMore: Ref<boolean>
  error: Ref<boolean>
  loadMoreError: Ref<boolean>
  loadMore: () => Promise<void> | void
}

interface Place {
  itemId: string
  loadedCount: number
  scrollY: number
}

function storageKey(section: AuthoringSection) {
  return `motifpath.teach-list-return.${section}.v1`
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false
  const place = value as Record<string, unknown>
  return (
    typeof place.itemId === 'string' &&
    typeof place.loadedCount === 'number' &&
    place.loadedCount >= 0 &&
    typeof place.scrollY === 'number' &&
    place.scrollY >= 0
  )
}

function takePlace(section: AuthoringSection): Place | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(section))
    window.sessionStorage.removeItem(storageKey(section))
    const stored: unknown = raw ? JSON.parse(raw) : null
    return isPlace(stored) ? stored : null
  } catch {
    return null
  }
}

function keepPlace(section: AuthoringSection, place: Place) {
  try {
    window.sessionStorage.setItem(storageKey(section), JSON.stringify(place))
  } catch {
    // Coming back to the top is the fallback; the list works the same.
  }
}

/**
 * Gives a Teach list back its place when the teacher comes back from one of its items' editor,
 * by the editor's back link or the browser's Back: the pages that were loaded, then the scroll
 * position. Reached from anywhere else, the list opens at the top. A page that fails while
 * catching up is not retried here; the list goes back to the place among what did load.
 */
export function useListReturn(options: {
  section: AuthoringSection
  /** The route name of the section's editor. */
  editorRoute: string
  /** The editor route's param naming the item. */
  idParam: string
  list: ReturnableList
}) {
  const router = useRouter()
  const { list } = options

  // The editor the teacher is coming back from: the entry before this one (its back link
  // pushed the list) or the one after it (the browser's Back).
  function cameFromItemId(): string | null {
    const state: unknown = window.history.state
    if (!state || typeof state !== 'object') return null
    for (const key of ['back', 'forward'] as const) {
      const path = (state as Record<string, unknown>)[key]
      if (typeof path !== 'string') continue
      const from = router.resolve(path)
      const id = from.params[options.idParam]
      if (from.name === options.editorRoute && typeof id === 'string') return id
    }
    return null
  }

  const stored = takePlace(options.section)
  const fromId = cameFromItemId()
  const pending = ref<Place | null>(stored && stored.itemId === fromId ? stored : null)

  watch(
    [list.itemCount, list.total, list.isLoading, list.isLoadingMore, list.error, list.loadMoreError],
    () => {
      const place = pending.value
      if (!place || list.isLoading.value || list.isLoadingMore.value) return
      if (list.error.value) {
        pending.value = null
        return
      }
      const target = Math.min(place.loadedCount, list.total.value)
      if (list.itemCount.value < target && !list.loadMoreError.value) {
        void list.loadMore()
        return
      }
      pending.value = null
      void nextTick(() => window.scrollTo(0, place.scrollY))
    },
    { immediate: true },
  )

  onBeforeRouteLeave((to) => {
    const id = to.params[options.idParam]
    if (to.name !== options.editorRoute || typeof id !== 'string') return
    keepPlace(options.section, { itemId: id, loadedCount: list.itemCount.value, scrollY: window.scrollY })
  })
}
