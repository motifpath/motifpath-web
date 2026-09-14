<script setup lang="ts">
withDefaults(defineProps<{ open: boolean; panelClass?: string }>(), { panelClass: '' })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div
    v-if="open"
    data-test="modal-overlay"
    class="fixed inset-0 z-20 flex items-center justify-center bg-brand-ground/45"
    @click="emit('close')"
  >
    <div data-test="modal-panel" :class="panelClass" @click.stop>
      <slot />
    </div>
  </div>
</template>
