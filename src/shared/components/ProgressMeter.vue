<script setup lang="ts">
import { computed, useId } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ completed: number; total: number }>()

const percent = computed(() => (props.total === 0 ? 0 : (props.completed / props.total) * 100))

const captionId = useId()

const { t } = useTypedT()
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="completed"
    aria-valuemin="0"
    :aria-valuemax="total"
    :aria-labelledby="captionId"
  >
    <div class="h-1.5 w-full rounded-full bg-surface-sunken">
      <div class="h-1.5 rounded-full bg-accent" :style="{ width: `${percent}%` }" />
    </div>
    <p :id="captionId" class="mt-1 text-sm text-ink-muted">{{ t('progressMeter.summary', { completed, total }) }}</p>
  </div>
</template>
