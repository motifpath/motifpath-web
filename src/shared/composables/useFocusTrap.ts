import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
}

/**
 * While `active`, keeps keyboard focus inside `container`: it moves in when the container
 * appears (to the element marked `data-autofocus`, else the first focusable one), Tab and
 * Shift+Tab wrap at both ends, and focus returns to whatever held it before once it's gone.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let returnTo: HTMLElement | null = null

  watch(
    active,
    async (isActive, wasActive) => {
      if (isActive && !wasActive) {
        returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
        await nextTick()
        const el = container.value
        if (!el) return
        const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(el)[0] ?? el
        target.focus()
      } else if (!isActive && wasActive) {
        restore()
      }
    },
    { immediate: true },
  )

  function restore() {
    const target = returnTo
    returnTo = null
    if (target && target.isConnected) target.focus()
  }

  onBeforeUnmount(() => {
    if (active.value) restore()
  })

  /** Keydown handler for the container: wraps Tab at its ends. */
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !container.value) return
    const items = focusables(container.value)
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return { onKeydown }
}
