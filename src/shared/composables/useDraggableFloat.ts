import { computed, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'

export type FloatSide = 'left' | 'right'

interface RestingPlace {
  side: FloatSide
  /** Distance from the bottom of the window to the element's bottom edge, in px; null = as low as allowed. */
  bottom: number | null
}

interface Options {
  /** Where the place is remembered on this device (localStorage). */
  storageKey: string
  /** The element's width and height, in px. */
  size: number
  /** The gap kept from the window's side and bottom edges, in px. */
  edge: number
  /** Space kept free at the top of the window (e.g. an app bar plus a gap), in px. */
  topReserve: number
  /** The lowest the element may sit — its default place — as a distance from the bottom, in px. */
  minBottom: MaybeRefOrGetter<number>
}

/** A movement shorter than this, in px, is a tap that wobbled, not a drag. */
const DRAG_THRESHOLD = 6

function readPlace(key: string): RestingPlace {
  const fallback: RestingPlace = { side: 'right', bottom: null }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return fallback
    const side = 'side' in parsed ? parsed.side : undefined
    const bottom = 'bottom' in parsed ? parsed.bottom : undefined
    if ((side !== 'left' && side !== 'right') || typeof bottom !== 'number') return fallback
    return { side, bottom }
  } catch {
    // Blocked or unreadable storage only costs the remembered place.
    return fallback
  }
}

function writePlace(key: string, place: RestingPlace): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(place))
  } catch {
    // Remembering the place is a convenience; the drag itself already happened.
  }
}

/**
 * A floating element the user can drag out of the way. At rest it sits against
 * the left or right edge of the window; a drag moves it freely, and on release
 * it settles against whichever side is nearer, at the height it was let go,
 * always entirely on screen and between `topReserve` and `minBottom`. Its place
 * is remembered per device, and brought back into view if the window shrinks.
 *
 * A drag starts from the element's box as the browser actually drew it, and
 * moves it by exactly the pointer's travel from there.
 */
export function useDraggableFloat(options: Options) {
  const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
  const place = ref<RestingPlace>(readPlace(options.storageKey))

  // Set only while a drag is under way: how far the element has moved from
  // where it was drawn when pressed, in px.
  const dragOffset = ref<{ x: number; y: number } | null>(null)
  let press: {
    pointerId: number
    startX: number
    startY: number
    /** The element's box when pressed, as the browser drew it. */
    origin: DOMRect
  } | null = null
  // A drag ends in a click on the element; that click must not act as a tap.
  let swallowNextClick = false

  const maxBottom = computed(() => viewport.value.height - options.topReserve - options.size)

  function clampBottom(bottom: number): number {
    const min = toValue(options.minBottom)
    return Math.max(min, Math.min(bottom, Math.max(min, maxBottom.value)))
  }

  const restingBottom = computed(() => clampBottom(place.value.bottom ?? toValue(options.minBottom)))

  // The movement from `origin` that keeps the element entirely on screen,
  // clear of the reserved space at the top and of `minBottom` at the bottom.
  function clampedOffset(origin: DOMRect, dx: number, dy: number): { x: number; y: number } {
    const { width, height } = viewport.value
    const x = Math.max(options.edge, Math.min(origin.left + dx, width - options.edge - origin.width))
    const y = Math.max(
      options.topReserve,
      Math.min(origin.top + dy, height - toValue(options.minBottom) - origin.height),
    )
    return { x: x - origin.left, y: y - origin.top }
  }

  const dragging = computed(() => dragOffset.value !== null)
  const side = computed<FloatSide>(() => place.value.side)
  // While dragging, the element keeps its resting place and is only shifted by
  // the pointer's travel, so it moves with the pointer from wherever it is
  // actually drawn — it cannot jump when the drag starts.
  const style = computed(() => ({
    bottom: `${restingBottom.value}px`,
    ...(dragOffset.value && { transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px)` }),
  }))

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !(event.currentTarget instanceof Element)) return
    viewport.value = { width: window.innerWidth, height: window.innerHeight }
    press = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: event.currentTarget.getBoundingClientRect(),
    }
    swallowNextClick = false
  }

  function onPointerMove(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return
    const dx = event.clientX - press.startX
    const dy = event.clientY - press.startY
    if (!dragOffset.value && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    if (!dragOffset.value && event.currentTarget instanceof Element) {
      // Keeps the moves coming even when the pointer outruns the element.
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    dragOffset.value = clampedOffset(press.origin, dx, dy)
  }

  function onPointerUp(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return
    const { origin } = press
    press = null
    const offset = dragOffset.value
    if (!offset) return
    dragOffset.value = null
    swallowNextClick = true
    const left = origin.left + offset.x
    const top = origin.top + offset.y
    const next: RestingPlace = {
      side: left + origin.width / 2 < viewport.value.width / 2 ? 'left' : 'right',
      bottom: viewport.value.height - top - origin.height,
    }
    place.value = next
    writePlace(options.storageKey, next)
  }

  function onPointerCancel(): void {
    press = null
    dragOffset.value = null
  }

  function onClick(event: MouseEvent): void {
    if (!swallowNextClick) return
    swallowNextClick = false
    event.preventDefault()
  }

  function onResize(): void {
    viewport.value = { width: window.innerWidth, height: window.innerHeight }
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))

  return {
    side,
    style,
    dragging,
    handlers: {
      pointerdown: onPointerDown,
      pointermove: onPointerMove,
      pointerup: onPointerUp,
      pointercancel: onPointerCancel,
      click: onClick,
    },
  }
}
