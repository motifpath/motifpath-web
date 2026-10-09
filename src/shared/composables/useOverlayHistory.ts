import { onBeforeUnmount, watch, type Ref } from 'vue'
import type { Router } from 'vue-router'

let nextId = 0

// The open layers' history entries, each with what to do when Back takes it off.
const layers = new Map<string, () => void>()

// What the current history entry is, as last seen here: whether it is a layer's entry, and its
// URL. Kept up to date on every step through history and, once installed, every navigation.
let currentIsLayer = false
let currentHref = ''

// Whether the router is between starting a navigation and finishing it. False when no router has
// the guards `installOverlayHistory` adds, as in a component test.
let navigating = false

/**
 * Runs before the router's own listener (capture comes first at the target). A step that only
 * crosses a layer's entry — Back closing a layer, or a layer taking its entry back off — stays on
 * the same URL. It closes the layers whose entries it took off, and stops there: for the router it
 * would be a navigation to where it already is, running the page's guards (an unsaved-changes
 * check) for nothing.
 */
function onPopState(event: PopStateEvent) {
  const arrivedAt: unknown = event.state?.overlay
  const crossesLayer = currentIsLayer || typeof arrivedAt === 'string'
  const sameUrl = window.location.href === currentHref
  currentIsLayer = typeof arrivedAt === 'string'
  currentHref = window.location.href

  for (const [entry, onBack] of [...layers]) {
    if (entry !== arrivedAt) {
      layers.delete(entry)
      onBack()
    }
  }
  if (crossesLayer && sameUrl) event.stopImmediatePropagation()
}

let listening = false
function listen() {
  if (listening) return
  listening = true
  window.addEventListener('popstate', onPopState, { capture: true })
}

/**
 * Lets layers see the router's navigations: which entry is current after each one, and when one
 * is under way, so a layer closed as part of a navigation leaves its entry alone rather than
 * stepping back over the page being opened.
 */
export function installOverlayHistory(router: Router) {
  listen()
  router.beforeEach(() => {
    navigating = true
  })
  router.afterEach(() => {
    navigating = false
    currentIsLayer = typeof window.history.state?.overlay === 'string'
    currentHref = window.location.href
  })
  router.onError(() => {
    navigating = false
  })
}

/**
 * Gives an open layer (sheet, dialog, menu) its own browser history entry, on the same URL, so
 * Back — the browser button or a phone's back gesture — closes the layer before it leaves the
 * page. `onBack` runs when Back takes that entry off. When the layer closes some other way, the
 * entry is taken back off too, unless the app has navigated on from it.
 */
export function useOverlayHistory(open: Ref<boolean>, onBack: () => void) {
  let entry: string | null = null

  function push() {
    listen()
    entry = `overlay-${++nextId}`
    layers.set(entry, () => {
      entry = null
      onBack()
    })
    // Keep the router's own state on the entry, so the router reads it as the page it is on.
    window.history.pushState({ ...window.history.state, overlay: entry }, '')
    currentIsLayer = true
    currentHref = window.location.href
  }

  function release() {
    if (entry === null) return
    const released = entry
    entry = null
    layers.delete(released)
    // The click that closed the layer may also be starting a navigation (a menu row that links
    // somewhere, "discard and leave"), whose guards only run once this task is over. Wait for it:
    // stepping back while the router pushes would undo the push. Once the page has moved on, the
    // entry stays behind under it, where it's one more step back to the same page.
    setTimeout(() => {
      if (!navigating && window.history.state?.overlay === released) window.history.back()
    })
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
