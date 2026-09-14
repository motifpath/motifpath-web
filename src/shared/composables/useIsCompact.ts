import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const COMPACT_QUERY = '(max-width: 767px)'

/**
 * Tracks the mobile/desktop split AppBar's `compact` prop needs — the one
 * breakpoint the PB-48 canvas implies by shipping separate desktop/mobile
 * artboards rather than a continuous responsive range.
 */
export function useIsCompact(): { isCompact: Ref<boolean> } {
  const isCompact = ref(false)
  let mql: MediaQueryList | null = null

  function handleChange(event: MediaQueryListEvent): void {
    isCompact.value = event.matches
  }

  onMounted(() => {
    mql = window.matchMedia(COMPACT_QUERY)
    isCompact.value = mql.matches
    mql.addEventListener('change', handleChange)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', handleChange)
  })

  return { isCompact }
}
