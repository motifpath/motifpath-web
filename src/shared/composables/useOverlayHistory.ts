import { onBeforeUnmount, watch, type Ref } from 'vue'

let nextId = 0

/**
 * Gives an open layer (sheet, dialog, menu) its own browser history entry, on the same URL, so
 * Back — the browser button or a phone's back gesture — closes the layer before it leaves the
 * page. `onBack` runs when Back takes that entry off. When the layer closes some other way, the
 * entry is taken back off too, unless the app has already navigated on from it.
 */
export function useOverlayHistory(open: Ref<boolean>, onBack: () => void) {
  let entry: string | null = null

  function onPopState() {
    if (entry !== null && window.history.state?.overlay !== entry) {
      entry = null
      window.removeEventListener('popstate', onPopState)
      onBack()
    }
  }

  function push() {
    entry = `overlay-${++nextId}`
    // Keep the router's own state on the entry, so stepping back to the page is a no-op for it.
    window.history.pushState({ ...window.history.state, overlay: entry }, '')
    window.addEventListener('popstate', onPopState)
  }

  function release() {
    if (entry === null) return
    const ours = window.history.state?.overlay === entry
    entry = null
    window.removeEventListener('popstate', onPopState)
    if (ours) window.history.back()
  }

  watch(
    open,
    (isOpen) => {
      if (isOpen && entry === null) push()
      else if (!isOpen) release()
    },
    { immediate: true },
  )
  onBeforeUnmount(release)
}
