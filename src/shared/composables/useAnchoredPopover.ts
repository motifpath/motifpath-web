import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { popoverPlacement } from '@/shared/utils/popoverPlacement'

/**
 * Keeps a popover drawn over the page (teleported to the body, `position: fixed`) next to its
 * anchor while it's open: placed when it opens and again whenever the page or any container
 * around the anchor scrolls, or the window resizes. Drawing it over the page means a container
 * that clips its content, such as a card, never cuts it off.
 */
export function useAnchoredPopover(anchor: Ref<HTMLElement | null>, popover: Ref<HTMLElement | null>, open: Ref<boolean>) {
  const style = ref<{ left: string; top: string }>({ left: '0px', top: '0px' })

  function place() {
    if (!anchor.value) return
    const rect = anchor.value.getBoundingClientRect()
    const { left, top } = popoverPlacement({
      anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
      width: popover.value?.offsetWidth ?? 0,
      height: popover.value?.offsetHeight ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })
    style.value = { left: `${left}px`, top: `${top}px` }
  }

  function listen(on: boolean) {
    const method = on ? 'addEventListener' : 'removeEventListener'
    window[method]('scroll', place, true)
    window[method]('resize', place)
  }

  watch(
    open,
    async (isOpen) => {
      listen(isOpen)
      if (!isOpen) return
      place()
      // Once drawn, its real size can flip it above the anchor or keep it on screen.
      await nextTick()
      place()
    },
    { immediate: true },
  )
  onBeforeUnmount(() => listen(false))

  return { style, place }
}
