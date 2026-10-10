<script setup lang="ts">
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(
  defineProps<{
    completed: number
    total: number
    /** Off where the caller already shows the count beside the bar. */
    showCount?: boolean
  }>(),
  { showCount: true },
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
      :aria-label="t('progressMeter.summary', { completed, total })"
    >
      <div class="h-1.5 rounded-full bg-accent" :style="{ width: `${percent}%` }" />
    </div>
    <span v-if="showCount" class="text-sm tabular-nums text-ink-muted" aria-hidden="true">{{ t('progressMeter.short', { completed, total }) }}</span>
  </div>
</template>
