<script setup lang="ts">
import type { Rating } from '@/spikes/practice/model'

const emit = defineEmits<{ rate: [rating: Rating] }>()

const options: { rating: Rating; label: string; hint: string; cls: string }[] = [
  {
    rating: 'struggled',
    label: 'Struggled',
    hint: 'mistakes, lost the beat',
    cls: 'bg-danger-muted',
  },
  { rating: 'almost', label: 'Almost', hint: 'a slip or two', cls: 'bg-warning-muted' },
  { rating: 'clean', label: 'Clean', hint: 'in time, every note', cls: 'bg-success-muted' },
]
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="o in options"
      :key="o.rating"
      type="button"
      class="flex flex-col items-center rounded-lg p-3 text-ink"
      :class="o.cls"
      @click="emit('rate', o.rating)"
    >
      <span class="text-base font-semibold">{{ o.label }}</span>
      <span class="text-xs text-ink-muted">{{ o.hint }}</span>
    </button>
  </div>
</template>
