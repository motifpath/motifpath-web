import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * Becomes true once `ms` have passed since the calling component mounted, so a wait that ends sooner
 * never flashes a busy state.
 */
export function useShownAfter(ms: number): Ref<boolean> {
  const shown = ref(false)
  const timer = setTimeout(() => {
    shown.value = true
  }, ms)
  onBeforeUnmount(() => clearTimeout(timer))
  return shown
}
