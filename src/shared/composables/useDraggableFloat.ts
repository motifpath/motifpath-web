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
 * Positions are computed from the window size and the element's known size, not
 * measured from the DOM, so the element can be dragged the moment it renders.
 */
export function useDraggableFloat(options: Options) {
  const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
  const place = ref<RestingPlace>(readPlace(options.storageKey))

  // Set only while a drag is under way: the element's top-left corner, in px.
  const dragPosition = ref<{ x: number; y: number } | null>(null)
  let press: { pointerId: number; startX: number; startY: number; originX: number; originY: number } | null = null
  // A drag ends in a click on the element; that click must not act as a tap.
  let swallowNextClick = false

  const maxBottom = computed(() => viewport.value.height - options.topReserve - options.size)

  function clampBottom(bottom: number): number {
    const min = toValue(options.minBottom)
    return Math.max(min, Math.min(bottom, Math.max(min, maxBottom.value)))
  }

  const restingBottom = computed(() => clampBottom(place.value.bottom ?? toValue(options.minBottom)))

  function restingTopLeft(): { x: number; y: number } {
    const x = place.value.side === 'left' ? options.edge : viewport.value.width - options.edge - options.size
    return { x, y: viewport.value.height - restingBottom.value - options.size }
  }

  function clampTopLeft(x: number, y: number): { x: number; y: number } {
    const maxX = viewport.value.width - options.edge - options.size
    const minY = viewport.value.height - clampBottom(Infinity) - options.size
    const maxY = viewport.value.height - toValue(options.minBottom) - options.size
    return {
      x: Math.max(options.edge, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    }
  }

  const dragging = computed(() => dragPosition.value !== null)
  const side = computed<FloatSide>(() => place.value.side)
  const style = computed(() =>
    dragPosition.value
      ? { left: `${dragPosition.value.x}px`, top: `${dragPosition.value.y}px` }
      : { bottom: `${restingBottom.value}px` },
  )

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    const origin = restingTopLeft()
    press = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
    }
    swallowNextClick = false
  }

  function onPointerMove(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return
    const dx = event.clientX - press.startX
    const dy = event.clientY - press.startY
    if (!dragPosition.value && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    if (!dragPosition.value && event.currentTarget instanceof Element) {
      // Keeps the moves coming even when the pointer outruns the element.
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    dragPosition.value = clampTopLeft(press.originX + dx, press.originY + dy)
  }

  function onPointerUp(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return
    press = null
    const dropped = dragPosition.value
    if (!dropped) return
    dragPosition.value = null
    swallowNextClick = true
    const next: RestingPlace = {
      side: dropped.x + options.size / 2 < viewport.value.width / 2 ? 'left' : 'right',
      bottom: viewport.value.height - dropped.y - options.size,
    }
    place.value = next
    writePlace(options.storageKey, next)
  }

  function onPointerCancel(): void {
    press = null
    dragPosition.value = null
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
