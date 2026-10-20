<script setup lang="ts">
/** The student screen's three measures in one card, for a phone. */
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ sessions: number; weeksAtTarget: number; weeksSoFar: number; percent: number }>()

const { t } = useTypedT()
</script>

<template>
  <div class="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-raised p-3.5">
    <div class="flex flex-col">
      <span data-test="summary-value" class="text-lg font-bold tabular-nums text-ink">{{ sessions }}</span>
      <span class="text-xs text-ink-muted">{{ t('engagement.studentScreen.summaryWeek') }}</span>
    </div>
    <div class="flex flex-col">
      <span data-test="summary-value" class="text-lg font-bold tabular-nums text-ink">
        {{ t('engagement.tiles.countOf', { count: weeksAtTarget, total: weeksSoFar }) }}
      </span>
      <span class="text-xs text-ink-muted">{{ t('engagement.studentScreen.summaryWeeks') }}</span>
    </div>
    <div class="flex flex-col">
      <span data-test="summary-value" class="text-lg font-bold tabular-nums text-ink">{{ t('engagement.tiles.percent', { percent }) }}</span>
      <span class="text-xs text-ink-muted">{{ t('engagement.studentScreen.summaryPath') }}</span>
    </div>
  </div>
</template>
