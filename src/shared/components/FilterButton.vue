<script setup lang="ts">
/** Opens a list's filters; shows how many are applied. */
import { SlidersHorizontal } from 'lucide-vue-next'

import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ count: number }>()
const emit = defineEmits<{ click: [] }>()

const { t } = useTypedT()
</script>

<template>
  <button
    type="button"
    :aria-label="count > 0 ? t('filters.buttonApplied', { count }) : t('filters.button')"
    class="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :class="count > 0 ? 'border-accent bg-accent-muted text-accent-text' : 'border-border bg-surface-raised text-ink'"
    @click="emit('click')"
  >
    <SlidersHorizontal :size="20" aria-hidden="true" />
    <span
      v-if="count > 0"
      data-test="filter-count"
      class="inline-flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-fg"
      aria-hidden="true"
    >{{ count }}</span>
  </button>
</template>
