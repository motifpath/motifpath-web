<script setup lang="ts">
import { Check } from 'lucide-vue-next'

defineProps<{ label: string; selected: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <!-- The button is the 48 px touch target; the chip drawn inside it is 40 px. -->
  <button
    type="button"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group inline-flex min-h-12 items-center focus-visible:outline-none"
    @click="emit('toggle')"
  >
    <span
      data-test="choice-chip-face"
      class="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm group-focus-visible:ring-2 group-focus-visible:ring-focus"
      :class="
        selected
          ? 'border-accent bg-accent-muted font-semibold text-accent-text'
          : 'border-border bg-surface-raised text-ink hover:bg-surface-sunken'
      "
    >
      <Check v-if="selected" data-test="choice-chip-check" :size="16" aria-hidden="true" />
      {{ label }}
    </span>
  </button>
</template>
