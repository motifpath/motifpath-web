<script setup lang="ts">
/**
 * The whole of a board too wide to fit, in miniature under it, with a window over the part in view.
 * It follows the board both ways: the board's scroll moves the window, and tapping or dragging
 * along the strip scrolls the board there, centred on the pointer. From the keyboard the window is
 * a horizontal scrollbar, half a view per arrow.
 */
import { computed, ref } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  /** The board's full width, in its own pixels. */
  contentWidth: number
  /** The width of the board's visible part. */
  viewWidth: number
  scrollLeft: number
  /** The diagram's name, for the window's label. */
  label: string
}>()

const emit = defineEmits<{ scrollTo: [left: number] }>()

defineSlots<{ default?: () => unknown }>()

const { t } = useTypedT()

const maxLeft = computed(() => Math.max(0, props.contentWidth - props.viewWidth))
const clamp = (left: number) => Math.round(Math.min(maxLeft.value, Math.max(0, left)))

const windowStyle = computed(() => ({
  left: `${(props.scrollLeft / props.contentWidth) * 100}%`,
  width: `${(props.viewWidth / props.contentWidth) * 100}%`,
}))
const percentInView = computed(() => (maxLeft.value === 0 ? 0 : Math.round((props.scrollLeft / maxLeft.value) * 100)))

const strip = ref<HTMLElement | null>(null)
let dragging = false

/** Scrolls the board so the place under the pointer is centred in view. */
function centreOn(clientX: number) {
  const box = strip.value?.getBoundingClientRect()
  if (!box || box.width === 0) return
  const share = (clientX - box.left) / box.width
  emit('scrollTo', clamp(share * props.contentWidth - props.viewWidth / 2))
}

function onPointerDown(event: PointerEvent) {
  dragging = true
  strip.value?.setPointerCapture?.(event.pointerId)
  centreOn(event.clientX)
}

function onPointerMove(event: PointerEvent) {
  if (dragging) centreOn(event.clientX)
}

function onPointerUp() {
  dragging = false
}

function onKeydown(event: KeyboardEvent) {
  const step = props.viewWidth / 2
  const keyed: Record<string, number> = {
    ArrowRight: props.scrollLeft + step,
    ArrowLeft: props.scrollLeft - step,
    Home: 0,
    End: maxLeft.value,
  }
  const left = keyed[event.key]
  if (left === undefined) return
  event.preventDefault()
  emit('scrollTo', clamp(left))
}
</script>

<template>
  <div
    ref="strip"
    data-test="overview-strip"
    class="relative cursor-pointer touch-none select-none overflow-hidden rounded-md border border-border bg-surface-raised"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="pointer-events-none" aria-hidden="true">
      <slot />
    </div>
    <div
      data-test="overview-window"
      class="absolute inset-y-0 rounded-md border-2 border-accent bg-accent/10 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      :style="windowStyle"
      role="scrollbar"
      tabindex="0"
      aria-orientation="horizontal"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percentInView"
      :aria-label="t('overviewStrip.window', { name: label })"
      @keydown="onKeydown"
    />
  </div>
</template>
