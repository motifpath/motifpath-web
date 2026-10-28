<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label: string
  /** One line on what the setting does, under the label. */
  description?: string
  modelValue: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const labelId = useId()
const descriptionId = useId()
</script>

<template>
  <!-- A setting that applies at once: the whole row is the switch, so it is one large target. -->
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue ? 'true' : 'false'"
    :aria-labelledby="labelId"
    :aria-describedby="description ? descriptionId : undefined"
    class="flex min-h-12 w-full items-center gap-4 py-3 pl-[1.25rem] pr-4 text-left hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span :id="labelId" class="text-base font-medium text-ink">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="text-sm text-ink-muted">{{ description }}</span>
    </span>
    <span
      class="relative h-6 w-[3.25rem] shrink-0 rounded-full transition-colors motion-reduce:transition-none"
      :class="modelValue ? 'bg-accent' : 'bg-ink-subtle'"
      aria-hidden="true"
    >
      <span
        class="absolute left-1 top-1 h-5 w-5 rounded-full shadow-level1 transition-transform motion-reduce:transition-none"
        :class="modelValue ? 'translate-x-[1.25rem] bg-accent-fg' : 'bg-surface-raised'"
      />
    </span>
  </button>
</template>
