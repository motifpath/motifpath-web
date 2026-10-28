<script setup lang="ts">
/**
 * The end of a practice session: what the run did (minutes, what it was practised on, how many
 * items), each line of the plan the student got to with how it went, and this week's minutes and
 * day streak. A run with nothing answered says so plainly and shows no score.
 *
 * A session with subjects gives one result per subject first: its score and the level change on the
 * rung practised, from the plan's level then to the level read once the session caught up. Reaching
 * accurate names the next rung; an unchanged level is steady. While the levels are read the line
 * keeps its place; a subject whose level isn't known shows the rungs practised instead.
 * In Today's mix one line sums up the quick review of other subjects, and the items wait behind
 * Every item; a session the student chose has one subject, so its items stay listed under it.
 *
 * Done goes back home; practising again is offered, more quietly.
 */
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import SummaryItems from '@/features/student/components/SummaryItems.vue'
import { usePracticeOverview } from '@/features/student/composables/usePracticeHome'
import { useWeekCaptions } from '@/features/student/composables/useWeekCaptions'
import type { SubjectResult, SubjectScore } from '@/features/student/utils/focusPlan'
import { levelChange, type LevelChange, type SubjectLevels } from '@/features/student/utils/levelChange'
import type { SummaryRow } from '@/features/student/utils/sessionSummary'
import { thisWeek } from '@/features/student/utils/studentHome'
import AppButton from '@/shared/components/AppButton.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetricTile from '@/shared/components/MetricTile.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']
type Rung = components['schemas']['PracticeRung']

const props = withDefaults(
  defineProps<{
    rows: SummaryRow[]
    minutes: number
    /** What the session was practised on: the instrument's name, or in the head. */
    instrumentName: string
    /** How many items the student answered or played. */
    itemCount: number
    /** What to call an item on screen. */
    labelOf: (item: Item) => string
    /** How each subject went, main first; none for a session without subjects. */
    subjects?: SubjectResult[]
    /** How the quick review of other subjects went; null when none of it was answered. */
    review?: SubjectScore | null
    /** The student chose the session's one subject. */
    chosen?: boolean
    /** Where the student stands on the subjects now; unknown shows the rungs practised. */
    levels?: SubjectLevels
  }>(),
  { subjects: () => [], review: null, chosen: false, levels: () => ({ state: 'unknown' }) },
)

const emit = defineEmits<{ done: []; practiseAgain: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

/** In Today's mix with subjects, the items fold behind Every item until opened. */
const folds = computed(() => props.subjects.length > 0 && !props.chosen)
const itemsOpen = ref(false)

function rungNames(rungs: Rung[]): string {
  return rungs.map((rung) => t(`sessionPlan.rungs.${rung}`)).join(' · ')
}

function levelLine(change: LevelChange): string {
  const rung = t(`sessionPlan.rungs.${change.rung}`)
  const after = t(`practiceHomeView.levels.${change.after}`)
  if (change.before === change.after) return t('sessionSummary.steady', { rung, level: after })
  const moved = t('sessionSummary.moved', { rung, before: t(`practiceHomeView.levels.${change.before}`), after })
  return change.next ? t('sessionSummary.next', { moved, next: t(`sessionPlan.rungs.${change.next}`) }) : moved
}

/** Each subject's level change line, by node; empty until the levels are read. */
const levelLines = computed(() => {
  const levels = props.levels
  if (levels.state !== 'read') return new Map<string, string>()
  return new Map(
    props.subjects.flatMap((result) => {
      const change = levelChange(result.node, levels.subjects.find((subject) => subject.node_id === result.node.node_id))
      return change ? [[result.node.node_id, levelLine(change)] as const] : []
    }),
  )
})

const { item: overview, isLoading: weekLoading, error: weekError, retry: retryWeek } = usePracticeOverview()
const week = computed(() => (overview.value ? thisWeek(overview.value) : null))
const { minutes: minutesCaption, streak: streakCaption } = useWeekCaptions(week)

const meta = computed(() => {
  const ran = t('sessionSummary.minutes', { minutes: props.minutes, instrument: props.instrumentName })
  return props.itemCount > 0 ? t('sessionSummary.withItems', { ran, count: props.itemCount }) : ran
})

</script>

<template>
  <section class="flex flex-col gap-5" data-test="session-done">
    <header class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold">{{ t('practiceSessionView.doneTitle') }}</h1>
      <p data-test="summary-meta" class="text-sm text-ink-muted">{{ meta }}</p>
    </header>

    <ul v-if="subjects.length > 0" class="flex flex-col gap-2.5">
      <li
        v-for="result in subjects"
        :key="result.node.node_id"
        data-test="subject-result"
        class="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised px-4 py-3"
      >
        <div class="flex items-baseline gap-3">
          <span data-test="subject-result-name" class="min-w-0 flex-1 font-semibold text-ink">{{ localizedName(result.node.names) }}</span>
          <span data-test="subject-result-score" class="shrink-0 text-sm font-semibold tabular-nums text-ink">
            {{ t('sessionSummary.counted', { right: result.right, answered: result.answered }) }}
          </span>
        </div>
        <span v-if="levelLines.has(result.node.node_id)" data-test="subject-result-level" class="text-xs text-ink-muted">
          {{ levelLines.get(result.node.node_id) }}
        </span>
        <span v-else-if="levels.state === 'pending'" data-test="subject-result-pending" class="flex h-4 items-center">
          <span class="sr-only">{{ t('sessionSummary.levelPending') }}</span>
          <span aria-hidden="true" class="h-3 w-40 animate-pulse rounded-full bg-surface-sunken" />
        </span>
        <span v-else data-test="subject-result-rungs" class="text-xs text-ink-muted">{{ rungNames(result.rungs) }}</span>
      </li>
    </ul>

    <template v-if="folds">
      <p v-if="review" data-test="review-result" class="text-sm text-ink-muted">
        {{ t('sessionSummary.review', { right: review.right, answered: review.answered }) }}
      </p>
      <button
        v-if="rows.length > 0"
        type="button"
        data-test="every-item"
        :aria-expanded="itemsOpen"
        class="inline-flex min-h-12 items-center gap-1 self-start text-sm font-semibold text-accent-text"
        @click="itemsOpen = !itemsOpen"
      >
        {{ t('sessionSummary.everyItem', { count: itemCount }) }}
        <ChevronDown v-if="itemsOpen" :size="16" aria-hidden="true" />
        <ChevronRight v-else :size="16" aria-hidden="true" />
      </button>
      <SummaryItems v-if="itemsOpen" :rows="rows" :label-of="labelOf" :titled="false" />
    </template>

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

    <SummaryItems v-if="rows.length > 0 && !folds" :rows="rows" :label-of="labelOf" />
    <p v-else-if="rows.length === 0" class="text-ink-muted">{{ t('sessionSummary.nothingAnswered') }}</p>

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
