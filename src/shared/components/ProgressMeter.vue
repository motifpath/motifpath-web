<script setup lang="ts">
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ completed: number; total: number }>()

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
    <span class="text-sm tabular-nums text-ink-muted" aria-hidden="true">{{ t('progressMeter.short', { completed, total }) }}</span>
  </div>
</template>
