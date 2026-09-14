<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineEmits<{ close: [] }>()
</script>

<template>
  <button
    type="button"
    data-test="close-modal"
    aria-label="Close"
    class="flex h-[30px] w-[30px] items-center justify-center rounded-sm bg-surface-sunken text-ink-muted"
    @click="$emit('close')"
  >
    <X :size="14" aria-hidden="true" />
  </button>
</template>
