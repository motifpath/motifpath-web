import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue'

export type SizeClass = 'compact' | 'medium' | 'expanded'

const MEDIUM_QUERY = '(min-width: 600px)'
const EXPANDED_QUERY = '(min-width: 840px)'

/**
 * The window's size class: compact below 600 px (a phone), medium up to 839 px, expanded from
 * 840 px. Layout containers follow it, never the content. Without `matchMedia` (a test runner
 * that doesn't model it) the window counts as expanded.
 */
export function useSizeClass(): { sizeClass: ComputedRef<SizeClass>; isCompact: ComputedRef<boolean> } {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const medium = ref(supported ? window.matchMedia(MEDIUM_QUERY).matches : true)
  const expanded = ref(supported ? window.matchMedia(EXPANDED_QUERY).matches : true)
  const cleanups: (() => void)[] = []

  function track(query: string, target: typeof medium) {
    const mql = window.matchMedia(query)
    const onChange = (event: { matches: boolean }) => {
      target.value = event.matches
    }
    target.value = mql.matches
    mql.addEventListener('change', onChange)
    cleanups.push(() => mql.removeEventListener('change', onChange))
  }

  onMounted(() => {
    if (!supported) return
    track(MEDIUM_QUERY, medium)
    track(EXPANDED_QUERY, expanded)
  })
  onBeforeUnmount(() => cleanups.forEach((cleanup) => cleanup()))

  const sizeClass = computed<SizeClass>(() => (expanded.value ? 'expanded' : medium.value ? 'medium' : 'compact'))
  return { sizeClass, isCompact: computed(() => sizeClass.value === 'compact') }
}
