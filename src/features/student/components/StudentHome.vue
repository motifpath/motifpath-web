<script setup lang="ts">
/**
 * The student's home. It answers "what now?" first, with today's practice (the screen's only
 * primary action) and the way back into their path, then shows two motivating blocks: this week's
 * numbers and their skills on today's instrument. Everything else about progress lives on Your
 * progress, which the tiles and "See all" open. Each block loads and fails on its own, so one
 * failure never takes the whole home.
 */
import { computed } from 'vue'

import HomeSkills from '@/features/student/components/HomeSkills.vue'
import { DEFAULT_SESSION_MINUTES } from '@/features/student/composables/useComposePracticeSession'
import { usePracticeOverview } from '@/features/student/composables/usePracticeHome'
import { useStepWording } from '@/features/student/composables/useStepWording'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { buildMyPath } from '@/features/student/utils/myPath'
import { skillsInstrumentId, thisWeek, todaysPractice } from '@/features/student/utils/studentHome'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetricTile from '@/shared/components/MetricTile.vue'
import PathCard from '@/shared/components/PathCard.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { sizeClass } = useSizeClass()
const { instruments } = useListInstruments()
const { item: overview, isLoading: overviewLoading, error: overviewError, retry: retryOverview } = usePracticeOverview()
const { data: studentPath, error: pathError, isLoading: pathLoading, retry: retryPath } = useStudentPath()
const { meta: stepMeta, lessonRoute } = useStepWording()

function greetingKey(hour: number) {
  if (hour < 12) return 'studentHome.greeting.morning' as const
  if (hour < 18) return 'studentHome.greeting.afternoon' as const
  return 'studentHome.greeting.evening' as const
}
const greeting = t(greetingKey(new Date().getHours()))

function instrumentName(instrumentId: string): string {
  const instrument = instruments.value.find((candidate) => candidate.instrument_id === instrumentId)
  return instrument ? localizedName(instrument.names) : ''
}

const today = computed(() => (overview.value ? todaysPractice(overview.value) : null))

const todayEyebrow = computed(() => {
  const name = today.value ? instrumentName(today.value.instrumentId) : ''
  return name ? t('studentHome.today.eyebrow', { instrument: name }) : t('studentHome.today.eyebrowAnyInstrument')
})

const startTo = computed(() =>
  today.value ? { name: 'practice-session', query: { instrument: today.value.instrumentId } } : { name: 'practice-session' },
)

/** Your skills, and the progress page the home opens, are about one instrument: today's. */
const focusInstrumentId = computed(() => (overview.value ? skillsInstrumentId(overview.value) : null))
const progressTo = computed(() =>
  focusInstrumentId.value ? { name: 'your-progress', query: { instrument: focusInstrumentId.value } } : { name: 'your-progress' },
)

const week = computed(() => (overview.value ? thisWeek(overview.value) : null))

const minutesCaption = computed(() => {
  if (!week.value) return undefined
  const { minutes, minutesChange } = week.value
  if (minutesChange > 0) return t('studentHome.week.minutesMore', { count: minutesChange })
  if (minutesChange < 0) return t('studentHome.week.minutesFewer', { count: -minutesChange })
  return minutes > 0 ? t('studentHome.week.minutesSame') : undefined
})

// A streak is shown kindly: with no current streak the tile invites one and keeps the best, never
// says one was lost, and keeps the same colours as every other tile.
const streakCaption = computed(() => {
  if (!week.value) return undefined
  const { streak, bestStreak } = week.value
  if (streak > 0) return t('studentHome.week.best', { count: bestStreak })
  return bestStreak > 0 ? t('studentHome.week.startStreak', { count: bestStreak }) : t('studentHome.week.startFirstStreak')
})

const songsCaption = computed(() =>
  week.value && week.value.songsThisWeek > 0 ? t('studentHome.week.songsThisWeek', { count: week.value.songsThisWeek }) : undefined,
)

const myPath = computed(() => (studentPath.value ? buildMyPath(studentPath.value) : null))

const pathNext = computed(() => {
  const next = myPath.value?.next
  return next ? { title: t('studentHome.path.step', { position: next.position, title: next.title }), meta: stepMeta(next) } : null
})

const pathTo = computed(() => (myPath.value?.next ? lessonRoute(myPath.value.next) : { name: 'path' }))
</script>

<template>
  <div
    data-test="student-home"
    class="flex flex-col gap-5"
    :class="{ 'mx-auto w-full max-w-[35rem]': sizeClass === 'medium' }"
  >
    <h1 class="text-xl font-bold text-ink">{{ greeting }}</h1>

    <div class="grid gap-5" :class="{ 'grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start': sizeClass === 'expanded' }">
      <div class="flex min-w-0 flex-col gap-5">
        <section data-test="home-today" class="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised px-4 pb-4 pt-4">
          <LoadingSkeleton v-if="overviewLoading" />
          <LoadFailed v-else-if="overviewError" :message="t('studentHome.today.error')" @retry="retryOverview()" />
          <template v-else-if="overview">
            <p class="text-xs font-semibold uppercase tracking-wide text-accent-text">{{ todayEyebrow }}</p>
            <h2 v-if="today" class="text-lg font-bold text-ink">
              {{ t('studentHome.today.step', { kind: t(`studentHome.today.kinds.${today.step.kind}`), skill: localizedName(today.step.names) }) }}
            </h2>
            <p v-else class="text-base text-ink">{{ t('studentHome.today.nothingSuggested') }}</p>
            <p class="text-sm text-ink-muted">{{ t('studentHome.today.length', { minutes: DEFAULT_SESSION_MINUTES }) }}</p>
            <PrimaryButton as="RouterLink" :to="startTo" class="mt-1 w-full">{{ t('studentHome.today.start') }}</PrimaryButton>
          </template>
        </section>

        <section data-test="home-path">
          <LoadingSkeleton v-if="pathLoading" />
          <div v-else-if="pathError === 'no-path'" class="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-raised p-4">
            <p class="text-sm text-ink-muted">{{ t('studentHome.path.noPath') }}</p>
            <RouterLink :to="{ name: 'path-catalog' }" data-test="find-path" class="inline-flex min-h-12 items-center text-sm font-semibold text-accent-text">
              {{ t('studentHome.path.findPath') }}
            </RouterLink>
          </div>
          <LoadFailed v-else-if="pathError" :message="t('studentHome.path.error')" @retry="retryPath()" />
          <PathCard
            v-else-if="studentPath && myPath"
            :path-name="studentPath.title"
            :completed="myPath.progress.completed"
            :total="myPath.progress.total"
            :next="pathNext"
            :to="pathTo"
          />
        </section>
      </div>

      <div class="flex min-w-0 flex-col gap-5">
        <section data-test="home-week" class="flex flex-col gap-3">
          <h2 class="text-base font-semibold text-ink">{{ t('studentHome.week.title') }}</h2>
          <LoadingSkeleton v-if="overviewLoading" />
          <LoadFailed v-else-if="overviewError" :message="t('studentHome.week.error')" @retry="retryOverview()" />
          <div v-else-if="week" class="grid grid-cols-3 gap-2.5">
            <MetricTile
              data-test="tile-minutes"
              :label="t('studentHome.week.minutes')"
              :value="week.minutes"
              :caption="minutesCaption"
              :caption-tone="week.minutesChange > 0 ? 'positive' : 'neutral'"
              :to="progressTo"
            />
            <MetricTile
              data-test="tile-streak"
              :label="t('studentHome.week.streak')"
              :value="week.streak"
              :caption="streakCaption"
              :caption-tone="week.streak > 0 ? 'positive' : 'neutral'"
              :to="progressTo"
            />
            <MetricTile
              data-test="tile-songs"
              :label="t('studentHome.week.songs')"
              :value="week.songs"
              :caption="songsCaption"
              caption-tone="positive"
              :to="progressTo"
            />
          </div>
        </section>

        <section v-if="focusInstrumentId" data-test="home-skills">
          <HomeSkills :key="focusInstrumentId" :instrument-id="focusInstrumentId" :instrument-name="instrumentName(focusInstrumentId)" />
        </section>
      </div>
    </div>
  </div>
</template>
