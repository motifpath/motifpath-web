<script setup lang="ts">
/**
 * Your progress: a page pushed onto the home, so Back returns to the home where the student left
 * it. Opened directly, with no page behind it, Back goes to the home instead.
 *
 * What is summed across instruments, This week and learning days, sits above the instrument
 * choice, so changing instrument never seems to leave numbers behind. Below the choice, everything
 * follows the chosen instrument, or the skills that suit any instrument.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import WeekDays from '@/features/student/components/WeekDays.vue'
import YourProgressInstrument from '@/features/student/components/YourProgressInstrument.vue'
import { usePracticeOverview } from '@/features/student/composables/usePracticeHome'
import { useWeekCaptions } from '@/features/student/composables/useWeekCaptions'
import { thisWeek } from '@/features/student/utils/studentHome'
import Icon from '@/shared/components/Icon.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetricTile from '@/shared/components/MetricTile.vue'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

/** The choice, and the address's value, for the skills that suit any instrument. */
const ANY_INSTRUMENT = 'any'

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { sizeClass } = useSizeClass()
const route = useRoute()
const router = useRouter()
const { instruments } = useListInstruments()
const { item: overview, isLoading: overviewLoading, error: overviewError, retry: retryOverview } = usePracticeOverview()

function goBack() {
  if (router.options.history.state.back) router.back()
  else void router.push({ name: 'home' })
}

const week = computed(() => (overview.value ? thisWeek(overview.value) : null))
const captions = useWeekCaptions(week)

const learningDays = computed(() => overview.value?.last_7_days.map((day) => ({ date: day.date, marked: day.learned })) ?? [])

const askedFor = computed(() => (typeof route.query.instrument === 'string' ? route.query.instrument : null))

/**
 * The chosen instrument, or "any". It is the one the address asks for when the student plays it,
 * else their first instrument. Without the overview to check it against, the address is trusted.
 * Undefined while the student's instruments are still loading.
 */
const chosen = computed<string | undefined>(() => {
  if (overviewLoading.value) return undefined
  if (!overview.value) return askedFor.value ?? ANY_INSTRUMENT
  const owned = overview.value.instruments.map((card) => card.instrument_id)
  if (askedFor.value === ANY_INSTRUMENT || (askedFor.value && owned.includes(askedFor.value))) return askedFor.value
  return owned[0] ?? ANY_INSTRUMENT
})

function instrumentName(instrumentId: string): string {
  const instrument = instruments.value.find((candidate) => candidate.instrument_id === instrumentId)
  return instrument ? localizedName(instrument.names) : ''
}

const choices = computed(() => {
  const owned = overview.value
    ? overview.value.instruments.map((card) => card.instrument_id)
    : [chosen.value].filter((id): id is string => id !== undefined && id !== ANY_INSTRUMENT)
  return [
    ...owned.map((id) => ({ value: id, label: instrumentName(id) })),
    { value: ANY_INSTRUMENT, label: t('yourProgressView.anyInstrument') },
  ]
})

/** Keeps the choice in the address without adding a page, so Back still returns to the home. */
function choose(instrument: string) {
  void router.replace({ query: { ...route.query, instrument } })
}
</script>

<template>
  <section data-test="your-progress" class="flex flex-col gap-5" :class="{ 'mx-auto w-full max-w-[35rem]': sizeClass === 'medium' }">
    <header class="flex items-center gap-2">
      <button
        type="button"
        data-test="your-progress-back"
        class="-ml-3 flex h-12 w-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('yourProgressView.back')"
        @click="goBack"
      >
        <Icon name="chevron-left" :size="24" />
      </button>
      <h1 class="text-lg font-semibold text-ink">{{ t('yourProgressView.title') }}</h1>
    </header>

    <section data-test="progress-week" class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-ink">
        {{ t('studentHome.week.title') }}
        <span class="font-medium text-ink-muted">· {{ t('yourProgressView.allInstruments') }}</span>
      </h2>
      <LoadingSkeleton v-if="overviewLoading" />
      <LoadFailed v-else-if="overviewError" :message="t('studentHome.week.error')" @retry="retryOverview()" />
      <div v-else-if="week" class="grid gap-2.5" :class="sizeClass === 'compact' ? 'grid-cols-2' : 'grid-cols-4'">
        <MetricTile
          data-test="tile-minutes"
          :label="t('studentHome.week.minutes')"
          :value="week.minutes"
          :caption="captions.minutes.value"
          :caption-tone="week.minutesChange > 0 ? 'positive' : 'neutral'"
        />
        <MetricTile
          data-test="tile-streak"
          :label="t('studentHome.week.streak')"
          :value="week.streak"
          :caption="captions.streak.value"
          :caption-tone="week.streak > 0 ? 'positive' : 'neutral'"
        />
        <MetricTile data-test="tile-songs" :label="t('studentHome.week.songs')" :value="week.songs" :caption="captions.songs.value" caption-tone="positive" />
        <MetricTile
          data-test="tile-skills-up"
          :label="t('studentHome.week.skillsUp')"
          :value="week.skillsUp"
          :caption="captions.skillsUp.value"
          caption-tone="positive"
        />
      </div>
    </section>

    <div v-if="overview" data-test="progress-learning-days">
      <WeekDays :label="t('yourProgressView.learningDays')" :marked-label="t('yourProgressView.learned')" :days="learningDays" />
    </div>

    <template v-if="chosen !== undefined">
      <div data-test="progress-instruments" :class="{ 'max-w-[26rem]': sizeClass !== 'compact' }">
        <SegmentedControl
          :model-value="chosen"
          :label="t('yourProgressView.instrumentChoice')"
          :options="choices"
          test-id-prefix="progress-instrument"
          @update:model-value="choose"
        />
      </div>

      <YourProgressInstrument :key="chosen" :instrument-id="chosen === ANY_INSTRUMENT ? null : chosen" />
    </template>
  </section>
</template>
