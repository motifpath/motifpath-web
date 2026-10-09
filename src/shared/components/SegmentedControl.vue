<script setup lang="ts">
defineProps<{
  /** Names the group for assistive technology. */
  label: string
  options: { value: string; label: string }[]
  testIdPrefix?: string
}>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="flex rounded-full bg-surface-sunken p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      :data-test="testIdPrefix ? `${testIdPrefix}-${option.value}` : undefined"
      class="min-h-10 flex-1 rounded-full px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :class="model === option.value ? 'bg-surface-raised font-semibold text-ink shadow-level1' : 'text-ink-muted hover:text-ink'"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
