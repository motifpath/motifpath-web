<script setup lang="ts">
import OverlayLayer from '@/shared/components/OverlayLayer.vue'

withDefaults(defineProps<{ open: boolean; panelClass?: string }>(), { panelClass: '' })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <!-- A centred panel the caller lays out itself, on the shared layer: scrim, Esc, focus kept
       inside, and Back closes it before leaving the page. -->
  <OverlayLayer data-test="modal-overlay" :open="open" @close="emit('close')">
    <div data-test="modal-panel" :class="panelClass">
      <slot />
    </div>
  </OverlayLayer>
</template>
