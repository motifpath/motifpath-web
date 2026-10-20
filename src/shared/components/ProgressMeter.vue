<script setup lang="ts">
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(
  defineProps<{
    completed: number
    total: number
    /** The short count beside the bar, when it needs a unit ("1 of 4 parts"). */
    label?: string
    /** The bar's full sentence for a screen reader, to go with `label`. */
    summary?: string
    /** `success` for something finished. */
    tone?: 'accent' | 'success'
  }>(),
  { label: undefined, summary: undefined, tone: 'accent' },
)

const percent = computed(() => (props.total === 0 ? 0 : (props.completed / props.total) * 100))

const { t } = useTypedT()
</script>

<template>
  <!-- The short count is for the eye; the bar carries the whole sentence for a screen reader. -->
  <div class="flex items-center gap-3">
    <div
      role="progressbar"
      class="h-1.5 flex-1 rounded-full bg-surface-sunken"
      :aria-valuenow="completed"
      aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="summary ?? t('progressMeter.summary', { completed, total })"
    >
      <div
        data-test="progress-fill"
        class="h-1.5 rounded-full"
        :class="tone === 'success' ? 'bg-success' : 'bg-accent'"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <span class="text-sm tabular-nums text-ink-muted" aria-hidden="true">{{ label ?? t('progressMeter.short', { completed, total }) }}</span>
  </div>
</template>
