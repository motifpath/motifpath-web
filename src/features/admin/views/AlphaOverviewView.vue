<script setup lang="ts">
/**
 * Engagement: the alpha measured against its success metric for one week, then one row (or card)
 * per student, 20 at a time. The chips and the name search are applied by the server, which also
 * counts every chip over the whole alpha. Read-only: nothing here changes anything. The week lives
 * in the address, so a student opened from here, and the way back, keep it.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ObservationCard from '@/features/admin/components/alpha/ObservationCard.vue'
import ObservationRow from '@/features/admin/components/alpha/ObservationRow.vue'
import WeekStepper from '@/features/admin/components/alpha/WeekStepper.vue'
import { useAlphaObservation } from '@/features/admin/composables/useAlphaObservation'
import { useFitsColumns } from '@/features/admin/composables/useFitsColumns'
import { useWeekLabel } from '@/features/admin/composables/useWeekLabel'
import { shiftWeek, type StudentFilter } from '@/features/admin/utils/alphaObservation'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import MetricTile from '@/shared/components/MetricTile.vue'
import SearchField from '@/shared/components/SearchField.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()
const { sizeClass } = useSizeClass()
const weekLabel = useWeekLabel()
const fitsColumns = useFitsColumns()

const week = computed(() => (typeof route.query.week === 'string' ? route.query.week : undefined))
const filter = ref<StudentFilter>('all')
const search = ref('')
const { observation, students, isLoading, isLoadingMore, error, loadMoreError, retry, loadMore } = useAlphaObservation(week, filter, search)

const now = new Date()

const FILTERS: StudentFilter[] = ['all', 'belowTarget', 'quiet']

const counts = computed<Record<StudentFilter, number>>(() => {
  const c = observation.value?.filter_counts
  return { all: c?.all ?? 0, belowTarget: c?.below_target ?? 0, quiet: c?.quiet ?? 0 }
})
const total = computed(() => observation.value?.students_total ?? 0)
const alphaIsEmpty = computed(() => observation.value !== null && counts.value.all === 0)

const tiles = computed(() => {
  if (!observation.value) return []
  const { summary, week: observed } = observation.value
  const of = (count: number) => t('engagement.tiles.countOf', { count, total: summary.student_count })
  return [
    {
      label: t(observed.running ? 'engagement.tiles.atTargetThisWeek' : 'engagement.tiles.atTargetThatWeek'),
      value: of(summary.at_target_in_week),
      caption: t('engagement.tiles.atTargetPreviousWeek', { count: summary.at_target_in_previous_week, total: summary.student_count }),
    },
    { label: t('engagement.tiles.everyWeek'), value: of(summary.at_target_every_week), caption: t('engagement.tiles.everyWeekCaption') },
    { label: t('engagement.tiles.firstPathOver'), value: of(summary.first_path_over_target), caption: t('engagement.tiles.firstPathOverCaption') },
    {
      label: t('engagement.tiles.median'),
      value: t('engagement.tiles.percent', { percent: summary.median_first_path_percent }),
      caption: t('engagement.tiles.medianCaption'),
    },
  ]
})

function stepWeek(weeks: number) {
  if (!observation.value) return
  void router.push({ name: 'admin-alpha', query: { week: shiftWeek(observation.value.week.week_start, weeks) } })
}

function studentRoute(studentId: string) {
  return { name: 'admin-alpha-student', params: { studentId }, query: week.value ? { week: week.value } : {} }
}
</script>

<template>
  <TeachShell section="admin-alpha">
    <main
      class="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pb-20 pt-4 lg:px-0 lg:pt-8"
      :class="sizeClass === 'medium' ? 'max-w-[560px]' : 'max-w-[880px]'"
    >
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="flex-1 text-[28px] font-bold leading-[34px] text-ink">{{ t('engagement.title') }}</h1>
        <WeekStepper
          v-if="observation"
          :label="weekLabel(observation.week, sizeClass === 'compact')"
          :can-go-next="!observation.week.running"
          @previous="stepWeek(-1)"
          @next="stepWeek(1)"
        />
      </div>

      <LoadingSkeleton v-if="isLoading && !observation" data-test="loading" />
      <div v-else-if="error" data-test="error">
        <LoadFailed :message="t('engagement.loadFailed')" @retry="retry" />
      </div>
      <template v-else-if="observation">
        <p v-if="sizeClass !== 'compact'" class="text-sm text-ink-muted">
          {{ t('engagement.intro', { count: observation.summary.student_count }) }}
          <template v-if="observation.week.running">{{ t('engagement.stillRunning') }}</template>
        </p>
        <p v-else-if="observation.week.running" class="text-sm text-ink-muted">{{ t('engagement.stillRunning') }}</p>

        <StateBlock v-if="alphaIsEmpty" data-test="empty" kind="empty" :title="t('engagement.title')" :message="t('engagement.empty')" />
        <template v-else>
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <MetricTile v-for="tile in tiles" :key="tile.label" :label="tile.label" :value="tile.value" :caption="tile.caption" />
          </div>

          <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div class="flex flex-wrap gap-2" role="group">
              <ChoiceChip
                v-for="name in FILTERS"
                :key="name"
                :data-test="`filter-${name}`"
                :label="t(`engagement.filters.${name}`, { count: counts[name] })"
                :selected="filter === name"
                @toggle="filter = name"
              />
            </div>
            <SearchField v-model="search" data-test="student-search" class="flex-1" :placeholder="t('engagement.search')" />
          </div>

          <p class="text-xs font-medium text-ink-muted">{{ t('engagement.count', { count: total }) }}</p>

          <p v-if="students.length === 0" data-test="no-matches" class="text-sm text-ink-muted">{{ t('engagement.noMatches') }}</p>
          <template v-else-if="fitsColumns">
            <div class="grid grid-cols-[200px_130px_150px_1fr_84px_20px] gap-4 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted" aria-hidden="true">
              <span>{{ t('engagement.columns.student') }}</span>
              <span>{{ t('engagement.columns.thisWeek') }}</span>
              <span>{{ t('engagement.columns.weeklySessions') }}</span>
              <span>{{ t('engagement.columns.firstPath') }}</span>
              <span>{{ t('engagement.columns.lastActive') }}</span>
              <span />
            </div>
            <ul class="flex flex-col gap-2">
              <li v-for="student in students" :key="student.student_id" data-test="observation-student" :data-name="student.display_name">
                <ObservationRow data-test="observation-row" :student="student" :now="now" :to="studentRoute(student.student_id)" />
              </li>
            </ul>
          </template>
          <ul v-else class="flex flex-col gap-3">
            <li v-for="student in students" :key="student.student_id" data-test="observation-student" :data-name="student.display_name">
              <ObservationCard data-test="observation-card" :student="student" :now="now" :to="studentRoute(student.student_id)" />
            </li>
          </ul>
          <LoadMoreButton
            :loaded="students.length"
            :total="total"
            :loading="isLoadingMore"
            :failed="loadMoreError"
            :label="t('engagement.loadMore')"
            @load="loadMore"
          />
        </template>
      </template>
    </main>
  </TeachShell>
</template>
