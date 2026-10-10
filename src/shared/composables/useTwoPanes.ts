import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue'

// The sidebar, the page gutters, a content column of at least 480 px and a side column of 320 px.
const TWO_PANES_QUERY = '(min-width: 1120px)'

/**
 * Whether the window has room for a page's two panes, a content column and a side column, beside
 * the sidebar. The expanded size class starts narrower than that, so below it the page keeps the
 * one column it has on a tablet. Read before the first render, so a wide window never flashes one
 * column. Without `matchMedia` (a test runner that doesn't model it) there is one column.
 */
export function useTwoPanes(): { twoPanes: ComputedRef<boolean> } {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const matches = ref(supported ? window.matchMedia(TWO_PANES_QUERY).matches : false)
  let cleanup: (() => void) | null = null

  onMounted(() => {
    if (!supported) return
    const mql = window.matchMedia(TWO_PANES_QUERY)
    const onChange = (event: { matches: boolean }) => {
      matches.value = event.matches
    }
    matches.value = mql.matches
    mql.addEventListener('change', onChange)
    cleanup = () => mql.removeEventListener('change', onChange)
  })
  onBeforeUnmount(() => cleanup?.())

  return { twoPanes: computed(() => matches.value) }
}
