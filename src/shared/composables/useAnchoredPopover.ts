import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { popoverPlacement } from '@/shared/utils/popoverPlacement'

/** Whether the anchor can be seen where it sits: not scrolled out of the screen or of a container
 *  that clips it, and not covered by something drawn over it, such as the app bar or a menu. */
function inSight(anchor: HTMLElement): boolean {
  if (typeof document.elementFromPoint !== 'function') return true
  const rect = anchor.getBoundingClientRect()
  const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
  return top !== null && (top === anchor || anchor.contains(top))
}

/**
 * Keeps a popover drawn over the page (teleported to the body, `position: fixed`) next to its
 * anchor while it's open: placed when it opens and again whenever the page or any container
 * around the anchor scrolls, the window resizes, or something is clicked (which may open a menu
 * over the anchor). Drawing it over the page means a container that clips its content, such as a
 * card, never cuts it off; it's hidden while its anchor is out of sight, so it never floats over
 * the app bar or a menu, or away from an anchor scrolled out of its board.
 */
export function useAnchoredPopover(anchor: Ref<HTMLElement | null>, popover: Ref<HTMLElement | null>, open: Ref<boolean>) {
  const style = ref<{ left: string; top: string; display?: string }>({ left: '0px', top: '0px' })

  function place() {
    if (!anchor.value) return
    if (!inSight(anchor.value)) {
      style.value = { ...style.value, display: 'none' }
      return
    }
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

  function placeAfterClick() {
    requestAnimationFrame(place)
  }

  function listen(on: boolean) {
    const method = on ? 'addEventListener' : 'removeEventListener'
    window[method]('scroll', place, true)
    window[method]('resize', place)
    document[method]('click', placeAfterClick, true)
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
