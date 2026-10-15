<script setup lang="ts">
/** Steps the observed week back and forward; it never steps past the running week. */
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ label: string; canGoNext: boolean }>()
const emit = defineEmits<{ previous: []; next: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div class="inline-flex h-10 items-center rounded-full border border-border bg-surface-raised">
    <button
      type="button"
      :aria-label="t('engagement.week.previous')"
      class="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="emit('previous')"
    >
      <ChevronLeft :size="20" aria-hidden="true" />
    </button>
    <span data-test="week-label" class="whitespace-nowrap px-1 text-sm font-semibold tabular-nums text-ink">{{ label }}</span>
    <button
      type="button"
      :aria-label="t('engagement.week.next')"
      :disabled="!canGoNext"
      class="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent"
      @click="emit('next')"
    >
      <ChevronRight :size="20" aria-hidden="true" />
    </button>
  </div>
</template>
