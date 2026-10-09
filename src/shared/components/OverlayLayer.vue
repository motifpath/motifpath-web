<script setup lang="ts">
import { ref, toRef } from 'vue'

import { useFocusTrap } from '@/shared/composables/useFocusTrap'
import { useOverlayHistory } from '@/shared/composables/useOverlayHistory'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** False for a layer that asks for a decision: a tap beside it mustn't count as one. */
    closeOnScrim?: boolean
    /** Where the layer's content sits: centred, along the bottom edge, or wherever its content places itself. */
    placement?: 'center' | 'bottom' | 'none'
  }>(),
  { closeOnScrim: true, placement: 'center' },
)
const emit = defineEmits<{ close: [] }>()

const layer = ref<HTMLElement | null>(null)
const { onKeydown: trapTab } = useFocusTrap(layer, toRef(props, 'open'))
useOverlayHistory(toRef(props, 'open'), () => emit('close'))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  trapTab(event)
}

function onScrimClick() {
  if (props.closeOnScrim) emit('close')
}
</script>

<template>
  <div v-if="open" ref="layer" class="fixed inset-0 z-40" @keydown="onKeydown">
    <div data-test="overlay-scrim" class="absolute inset-0 bg-scrim/40" @click="onScrimClick" />
    <div
      class="pointer-events-none absolute inset-0 flex"
      :class="{
        'items-center justify-center p-4': placement === 'center',
        'items-end justify-center': placement === 'bottom',
      }"
    >
      <div class="pointer-events-auto contents">
        <slot />
      </div>
    </div>
  </div>
</template>
