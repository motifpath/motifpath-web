import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Tracks whether `query` currently matches, reactively. `query` is a plain
 * media query string, so a caller can express something Tailwind's own
 * `screens` config can't — e.g. a compound width-or-height condition — without
 * adding a config-level screen for a single, narrowly-scoped decision.
 */
export function useMediaQuery(query: string): { matches: Ref<boolean> } {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  function handleChange(event: MediaQueryListEvent): void {
    matches.value = event.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', handleChange)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', handleChange)
  })

  return { matches }
}
