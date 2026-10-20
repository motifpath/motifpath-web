import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from 'vue'

/**
 * How many pixels of the window's bottom the on-screen keyboard covers, so a bar fixed to the
 * bottom can sit just above it. The visual viewport shrinks while the keyboard is open; the
 * layout viewport (`innerHeight`) doesn't. 0 without a keyboard, and in a browser without
 * `visualViewport`.
 */
export function useKeyboardInset(): Readonly<Ref<number>> {
  const inset = ref(0)
  const viewport = typeof window !== 'undefined' ? window.visualViewport : undefined

  function measure() {
    if (!viewport) return
    inset.value = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
  }

  measure()
  onMounted(() => {
    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
  })
  onBeforeUnmount(() => {
    viewport?.removeEventListener('resize', measure)
    viewport?.removeEventListener('scroll', measure)
  })

  return readonly(inset)
}
