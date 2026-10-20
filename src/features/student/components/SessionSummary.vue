<script setup lang="ts">
/**
 * The end of a practice session: what the run did (minutes, what it was practised on, how many
 * items), each line of the plan the student got to with how it went, and this week's minutes and
 * day streak. A run with nothing answered says so plainly and shows no score.
 *
 * Done goes back home; practising again is offered, more quietly.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { usePracticeOverview } from '@/features/student/composables/usePracticeHome'
import { useWeekCaptions } from '@/features/student/composables/useWeekCaptions'
import type { SummaryResult, SummaryRow } from '@/features/student/utils/sessionSummary'
import { thisWeek } from '@/features/student/utils/studentHome'
import AppButton from '@/shared/components/AppButton.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetricTile from '@/shared/components/MetricTile.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTempoAsPlayed } from '@/shared/composables/useTempoAsPlayed'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

const props = defineProps<{
  rows: SummaryRow[]
  minutes: number
  /** What the session was practised on: the instrument's name, or in the head. */
  instrumentName: string
  /** How many items the student answered or played. */
  itemCount: number
  /** What to call an item on screen. */
  labelOf: (item: Item) => string
}>()

const emit = defineEmits<{ done: []; practiseAgain: [] }>()

const { t } = useTypedT()
const { asPlayed } = useTempoAsPlayed()

const { item: overview, isLoading: weekLoading, error: weekError, retry: retryWeek } = usePracticeOverview()
const week = computed(() => (overview.value ? thisWeek(overview.value) : null))
const { minutes: minutesCaption, streak: streakCaption } = useWeekCaptions(week)

const meta = computed(() => {
  const ran = t('sessionSummary.minutes', { minutes: props.minutes, instrument: props.instrumentName })
  return props.itemCount > 0 ? t('sessionSummary.withItems', { ran, count: props.itemCount }) : ran
})

function resultText(result: SummaryResult): string {
  if (result.kind === 'played') {
    return t('sessionSummary.played', { tempo: asPlayed(result.fastestBpm, result.fastestNoteValue), rating: t(`playAlongTake.ratings.${result.rating}`) })
  }
  if (result.kind === 'rated') return t(`playAlongTake.ratings.${result.rating}`)
  if (result.kind === 'changes') {
    return t('sessionSummary.changes', { count: result.cleanChanges, tempo: result.tempoBpm, rating: t(`playAlongTake.ratings.${result.rating}`) })
  }
  if (result.kind === 'counted') return t('sessionSummary.counted', { right: result.right, answered: result.answered })
  return result.correct ? t('sessionSummary.right') : t('sessionSummary.notQuite')
}
</script>

<template>
  <section class="flex flex-col gap-5" data-test="session-done">
    <header class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold">{{ t('practiceSessionView.doneTitle') }}</h1>
      <p data-test="summary-meta" class="text-sm text-ink-muted">{{ meta }}</p>
    </header>

    <LoadingSkeleton v-if="weekLoading" :count="1" />
    <LoadFailed v-else-if="weekError" :message="t('studentHome.week.error')" @retry="retryWeek()" />
    <div v-else-if="week" class="grid grid-cols-2 gap-2.5">
      <MetricTile
        data-test="tile-minutes"
        :label="t('studentHome.week.minutes')"
        :value="week.minutes"
        :caption="minutesCaption"
        :caption-tone="week.minutesChange > 0 ? 'positive' : 'neutral'"
      />
      <MetricTile
        data-test="tile-streak"
        :label="t('studentHome.week.streak')"
        :value="week.streak"
        :caption="streakCaption"
        :caption-tone="week.streak > 0 ? 'positive' : 'neutral'"
      />
    </div>

    <section v-if="rows.length > 0" class="flex flex-col gap-2">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('sessionSummary.whatYouPractised') }}</h2>
      <ul class="flex flex-col">
        <li v-for="row in rows" :key="row.key" data-test="summary-row" :data-good="row.good" class="flex items-center gap-3 py-2">
          <CircleCheck v-if="row.good" :size="22" class="shrink-0 text-success" aria-hidden="true" />
          <CircleX v-else :size="22" class="shrink-0 text-ink-muted" aria-hidden="true" />
          <span data-test="summary-row-name" class="min-w-0 flex-1 font-medium">{{ labelOf(row.item) }}</span>
          <span data-test="summary-row-result" class="shrink-0 text-right text-sm text-ink-muted">{{ resultText(row.result) }}</span>
        </li>
      </ul>
    </section>
    <p v-else class="text-ink-muted">{{ t('sessionSummary.nothingAnswered') }}</p>

    <PracticeActionBar>
      <AppButton data-test="practise-again" variant="tertiary" class="h-12 px-4" @click="emit('practiseAgain')">
        {{ t('practiceSessionView.practiseAgain') }}
      </AppButton>
      <PrimaryButton data-test="done" data-primary-action class="h-12 flex-1" @click="emit('done')">
        {{ t('sessionSummary.done') }}
      </PrimaryButton>
    </PracticeActionBar>
  </section>
</template>
