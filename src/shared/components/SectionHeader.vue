<script setup lang="ts">
/**
 * A section's heading with its count ("2 of 5"). A finished section can fold into this one row:
 * then the heading is a button that unfolds it, with a check in front.
 */
import Icon from '@/shared/components/Icon.vue'

withDefaults(
  defineProps<{
    label: string
    count: string
    /** The section is finished, so the row folds and unfolds it. */
    foldable?: boolean
    expanded?: boolean
  }>(),
  { foldable: false, expanded: false },
)
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-muted">
    <button
      v-if="foldable"
      type="button"
      data-test="section-toggle"
      :aria-expanded="expanded ? 'true' : 'false'"
      class="flex min-h-12 w-full items-center gap-2 rounded-lg bg-surface-sunken px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      @click="emit('toggle')"
    >
      <span class="text-success"><Icon name="check" :size="16" /></span>
      <span class="flex-1 text-left">{{ label }}</span>
      <span class="font-normal normal-case tracking-normal tabular-nums">{{ count }}</span>
      <span class="transition-transform" :class="expanded && 'rotate-180'"><Icon name="chevron-down" :size="18" /></span>
    </button>
    <span v-else class="flex min-h-10 items-center gap-2 px-3">
      <span class="flex-1">{{ label }}</span>
      <span class="font-normal normal-case tracking-normal tabular-nums">{{ count }}</span>
    </span>
  </h3>
</template>
