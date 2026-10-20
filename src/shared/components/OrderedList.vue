<script setup lang="ts">
import { onBeforeUnmount, provide, ref } from 'vue'

import { ORDERED_LIST } from '@/shared/components/orderedListContext'

/**
 * A list whose rows (OrderedRow) reorder by dragging their handle — with a finger, a mouse or a
 * pen — or from each row's ⋮ menu. It only reports the move; the list's owner reorders its items.
 */
const emit = defineEmits<{ move: [from: number, to: number] }>()

const list = ref<HTMLElement | null>(null)
const draggingIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function rowIndexAt(clientY: number): number | null {
  const rows = list.value?.querySelectorAll<HTMLElement>('[data-ordered-index]') ?? []
  for (const row of rows) {
    const { top, bottom } = row.getBoundingClientRect()
    if (clientY >= top && clientY <= bottom) return Number(row.dataset.orderedIndex)
  }
  return null
}

function onPointerMove(event: PointerEvent) {
  const index = rowIndexAt(event.clientY)
  if (index !== null) overIndex.value = index
}

function onPointerUp() {
  const from = draggingIndex.value
  const to = overIndex.value
  stopDrag()
  if (from !== null && to !== null && from !== to) emit('move', from, to)
}

function stopDrag() {
  draggingIndex.value = null
  overIndex.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', stopDrag)
}

function startDrag(index: number, event: PointerEvent) {
  // Keeps the page from scrolling or selecting text while a finger or mouse drags the handle.
  event.preventDefault()
  draggingIndex.value = index
  overIndex.value = index
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', stopDrag)
}

onBeforeUnmount(stopDrag)

provide(ORDERED_LIST, { draggingIndex, overIndex, startDrag, move: (from, to) => emit('move', from, to) })
</script>

<template>
  <ol ref="list" class="flex flex-col gap-2">
    <slot />
  </ol>
</template>
