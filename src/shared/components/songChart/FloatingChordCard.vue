<script setup lang="ts">
/**
 * Holds a chord card over the chart in one of the screen's corners. The student drags it by
 * anything but its buttons, and it settles in the corner nearest where it is dropped; a press that
 * barely moves stays a tap. The bottom corners sit above the action bar, and above the tempo bar
 * too when it shows (`lifted`); the top ones sit under the reader's bar.
 */
import { computed, onUnmounted, ref } from 'vue'

export type CardCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const props = withDefaults(defineProps<{ lifted?: boolean }>(), { lifted: false })
const corner = defineModel<CardCorner>('corner', { required: true })

/** How far a press must travel before it counts as a drag, in CSS pixels. */
const DRAG_THRESHOLD = 8

const start = ref<{ x: number; y: number } | null>(null)
const offset = ref({ x: 0, y: 0 })
const dragging = computed(() => Math.hypot(offset.value.x, offset.value.y) >= DRAG_THRESHOLD)

const placement = computed<Record<CardCorner, string>>(() => {
  const bottom = props.lifted ? 'bottom-60' : 'bottom-32'
  return { 'top-left': 'left-4 top-16', 'top-right': 'right-4 top-16', 'bottom-left': `${bottom} left-4`, 'bottom-right': `${bottom} right-4` }
})

function nearestCorner(x: number, y: number): CardCorner {
  const vertical = y < window.innerHeight / 2 ? 'top' : 'bottom'
  const horizontal = x < window.innerWidth / 2 ? 'left' : 'right'
  return `${vertical}-${horizontal}`
}

function onPointerDown(event: PointerEvent | MouseEvent) {
  if (event.target instanceof Element && event.target.closest('button, a, input')) return
  start.value = { x: event.clientX, y: event.clientY }
  offset.value = { x: 0, y: 0 }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent | MouseEvent) {
  if (!start.value) return
  offset.value = { x: event.clientX - start.value.x, y: event.clientY - start.value.y }
}

function onPointerUp(event: PointerEvent | MouseEvent) {
  onPointerMove(event)
  if (dragging.value) {
    const next = nearestCorner(event.clientX, event.clientY)
    if (next !== corner.value) corner.value = next
  }
  stop()
}

function stop() {
  start.value = null
  offset.value = { x: 0, y: 0 }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onUnmounted(stop)

// Follows the pointer while dragging; the offset is only known at run time, so it can't be a class.
const dragStyle = computed(() => (dragging.value ? { transform: `translate(${offset.value.x}px, ${offset.value.y}px)` } : undefined))
</script>

<template>
  <div
    data-test="floating-chord-card"
    :data-corner="corner"
    class="fixed z-30 touch-none select-none"
    :class="[placement[corner], dragging ? 'cursor-grabbing' : 'cursor-grab transition-[top,right,bottom,left]']"
    :style="dragStyle"
    @pointerdown="onPointerDown"
  >
    <slot />
  </div>
</template>
