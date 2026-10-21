<script setup lang="ts">
/**
 * What a session's summary lists of the items the student got to: each line of the plan with how
 * it went, marked by an icon, never colour alone. A heading names the list unless it opens under
 * a heading of its own.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { TOUR_ORDER } from '@/features/student/utils/keyTour'
import type { SummaryResult, SummaryRow } from '@/features/student/utils/sessionSummary'
import { useTempoAsPlayed } from '@/shared/composables/useTempoAsPlayed'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

withDefaults(
  defineProps<{
    rows: SummaryRow[]
    /** What to call an item on screen. */
    labelOf: (item: Item) => string
    titled?: boolean
  }>(),
  { titled: true },
)

const { t } = useTypedT()
const { asPlayed } = useTempoAsPlayed()

function resultText(result: SummaryResult): string {
  if (result.kind === 'played') {
    return t('sessionSummary.played', { tempo: asPlayed(result.fastestBpm, result.fastestNoteValue), rating: t(`playAlongTake.ratings.${result.rating}`) })
  }
  if (result.kind === 'rated') return t(`playAlongTake.ratings.${result.rating}`)
  if (result.kind === 'changes') {
    return t('sessionSummary.changes', { count: result.cleanChanges, tempo: result.tempoBpm, rating: t(`playAlongTake.ratings.${result.rating}`) })
  }
  if (result.kind === 'toured') return t('sessionSummary.toured', { count: result.cleanKeys, total: TOUR_ORDER.length, tempo: result.tourBpm })
  if (result.kind === 'counted') return t('sessionSummary.counted', { right: result.right, answered: result.answered })
  return result.correct ? t('sessionSummary.right') : t('sessionSummary.notQuite')
}
</script>

<template>
  <section class="flex flex-col gap-2">
    <h2 v-if="titled" class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('sessionSummary.whatYouPractised') }}</h2>
    <ul class="flex flex-col">
      <li v-for="row in rows" :key="row.key" data-test="summary-row" :data-good="row.good" class="flex items-center gap-3 py-2">
        <CircleCheck v-if="row.good" :size="22" class="shrink-0 text-success" aria-hidden="true" />
        <CircleX v-else :size="22" class="shrink-0 text-ink-muted" aria-hidden="true" />
        <span data-test="summary-row-name" class="min-w-0 flex-1 font-medium">{{ labelOf(row.item) }}</span>
        <span data-test="summary-row-result" class="shrink-0 text-right text-sm text-ink-muted">{{ resultText(row.result) }}</span>
      </li>
    </ul>
  </section>
</template>
