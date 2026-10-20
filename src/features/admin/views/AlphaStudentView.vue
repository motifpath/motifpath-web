<script setup lang="ts">
/**
 * One student of the alpha for one week: the same measures as the overview, the practice sessions
 * behind them in every state, and the first path node by node. On a phone or a tablet the three
 * parts are tabs. Read-only.
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import EventLog from '@/features/admin/components/alpha/EventLog.vue'
import FirstPathBar from '@/features/admin/components/alpha/FirstPathBar.vue'
import PathNodeRow from '@/features/admin/components/alpha/PathNodeRow.vue'
import SessionRow from '@/features/admin/components/alpha/SessionRow.vue'
import WeekSummary from '@/features/admin/components/alpha/WeekSummary.vue'
import { useAlphaStudentObservation } from '@/features/admin/composables/useAlphaObservation'
import { useEngagementLabels } from '@/features/admin/composables/useEngagementLabels'
import { useWeekLabel } from '@/features/admin/composables/useWeekLabel'
import { alphaDay, shiftWeek, weekEndOf, weekRange } from '@/features/admin/utils/alphaObservation'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetricTile from '@/shared/components/MetricTile.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'

const props = defineProps<{ studentId: string }>()

const route = useRoute()
const router = useRouter()
const { sizeClass } = useSizeClass()
const { t, locale, chip, lastActiveInline } = useEngagementLabels()
const weekLabel = useWeekLabel()

const week = computed(() => (typeof route.query.week === 'string' ? route.query.week : undefined))
const { observation, isLoading, error, retry } = useAlphaStudentObservation(props.studentId, week)

const now = new Date()
const tab = ref<'sessions' | 'firstPath' | 'events'>('sessions')
const tabOptions = computed(() => [
  { value: 'sessions', label: t('engagement.studentScreen.tabs.sessions') },
  { value: 'firstPath', label: t('engagement.studentScreen.tabs.firstPath') },
  { value: 'events', label: t('engagement.studentScreen.tabs.events') },
])

const student = computed(() => observation.value?.student ?? null)
const path = computed(() => student.value?.first_path ?? null)
const overviewRoute = computed(() => ({ name: 'admin-alpha', query: week.value ? { week: week.value } : {} }))
const eventsRoute = computed(() => ({ name: 'admin-alpha-events', query: { student: props.studentId } }))

const subtitle = computed(() =>
  student.value
    ? t('engagement.studentScreen.subtitle', {
        joined: alphaDay(student.value.registered_at, locale.value),
        path: student.value.first_path.title,
        lastActive: lastActiveInline(student.value, now),
      })
    : '',
)

const tiles = computed(() => {
  if (!observation.value || !student.value || !path.value) return []
  const s = student.value
  return [
    {
      label: t(observation.value.week.running ? 'engagement.studentScreen.sessionsTile' : 'engagement.studentScreen.sessionsThatWeekTile'),
      value: s.finished_sessions_in_week,
      caption: t('engagement.studentScreen.sessionsCaption', { chip: chip(s.finished_sessions_in_week).label }),
    },
    {
      label: t('engagement.studentScreen.weeksTile'),
      value: t('engagement.tiles.countOf', { count: s.weeks_at_target_count, total: s.weeks_so_far_count }),
      caption: t('engagement.studentScreen.weeksCaption'),
    },
    {
      label: t('engagement.studentScreen.firstPathTile'),
      value: t('engagement.tiles.percent', { percent: path.value.completed_percent }),
      caption: t('engagement.studentScreen.firstPathCaption', { completed: path.value.completed_nodes, total: path.value.total_nodes }),
    },
  ]
})

const pathProgress = computed(() =>
  path.value
    ? t('engagement.studentScreen.firstPathProgress', {
        completed: path.value.completed_nodes,
        total: path.value.total_nodes,
        percent: path.value.completed_percent,
      })
    : '',
)

/** The two weeks before the ones shown, which "Earlier weeks" moves to. */
const earlierRange = computed(() => {
  if (!observation.value) return ''
  const start = observation.value.week.week_start
  return weekRange({ week_start: shiftWeek(start, -3), week_end: weekEndOf(shiftWeek(start, -2)) }, locale.value)
})

function showEarlierWeeks() {
  if (!observation.value) return
  void router.push({ name: 'admin-alpha-student', params: { studentId: props.studentId }, query: { week: shiftWeek(observation.value.week.week_start, -2) } })
}

const showSessions = computed(() => sizeClass.value === 'expanded' || tab.value === 'sessions')
const showFirstPath = computed(() => sizeClass.value === 'expanded' || tab.value === 'firstPath')
</script>

<template>
  <TeachShell section="admin-alpha" bar="none">
    <PageBackBar v-if="sizeClass !== 'expanded'" :title="t('engagement.title')" :to="overviewRoute" :back-label="t('engagement.backLabel')" />
    <main
      class="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pb-20 pt-4 lg:px-0 lg:pt-8"
      :class="sizeClass === 'medium' ? 'max-w-[560px]' : 'max-w-[880px]'"
    >
      <RouterLink
        v-if="sizeClass === 'expanded'"
        data-test="breadcrumb"
        :to="overviewRoute"
        class="self-start text-xs font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {{ t('engagement.title') }} ›
      </RouterLink>

      <LoadingSkeleton v-if="isLoading && !observation" data-test="loading" />
      <div v-else-if="error" data-test="error">
        <LoadFailed :message="t('engagement.studentLoadFailed')" @retry="retry" />
      </div>
      <template v-else-if="observation && student && path">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="flex-1 text-[28px] font-bold leading-[34px] text-ink">{{ student.display_name }}</h1>
          <RouterLink
            v-if="sizeClass === 'expanded'"
            data-test="see-events"
            :to="eventsRoute"
            class="flex h-12 items-center rounded-full border border-accent px-6 text-base font-semibold text-accent-text hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {{ t('engagement.studentScreen.seeEvents') }}
          </RouterLink>
        </div>
        <p class="text-sm text-ink-muted">{{ subtitle }}</p>

        <WeekSummary
          v-if="sizeClass !== 'expanded'"
          :sessions="student.finished_sessions_in_week"
          :weeks-at-target="student.weeks_at_target_count"
          :weeks-so-far="student.weeks_so_far_count"
          :percent="path.completed_percent"
        />
        <div v-else class="grid grid-cols-3 gap-3">
          <MetricTile v-for="tile in tiles" :key="tile.label" :label="tile.label" :value="tile.value" :caption="tile.caption" />
        </div>

        <SegmentedControl v-if="sizeClass !== 'expanded'" v-model="tab" :label="student.display_name" :options="tabOptions" test-id-prefix="student-tab" />

        <div class="flex flex-col gap-4" :class="{ 'lg:grid lg:grid-cols-[1fr_320px] lg:items-start': sizeClass === 'expanded' }">
          <section v-if="showSessions" class="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-raised">
            <header class="flex flex-col gap-1 px-4 pb-2 pt-4">
              <h2 v-if="sizeClass === 'expanded'" class="text-xl font-semibold text-ink">{{ t('engagement.studentScreen.sessionsTitle') }}</h2>
              <p class="text-xs text-ink-muted">
                {{ t(sizeClass !== 'expanded' ? 'engagement.studentScreen.onlyFinishedCount' : 'engagement.studentScreen.onlyFinishedCountLong') }}
              </p>
            </header>
            <template v-for="sessionWeek in observation.session_weeks" :key="sessionWeek.week.week_start">
              <h3 data-test="session-week" class="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {{ t('engagement.studentScreen.weekGroup', { label: weekLabel(sessionWeek.week), count: sessionWeek.finished_sessions }) }}
              </h3>
              <SessionRow v-for="session in sessionWeek.sessions" :key="session.practice_session_id" :session="session" />
              <p v-if="sessionWeek.sessions.length === 0" class="px-4 pb-2 text-xs text-ink-subtle">{{ t('engagement.studentScreen.noSessions') }}</p>
            </template>
            <button
              type="button"
              data-test="earlier-weeks"
              class="flex min-h-12 items-center gap-1 border-t border-border px-4 text-left text-sm font-semibold text-accent-text hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              @click="showEarlierWeeks"
            >
              {{ t('engagement.studentScreen.earlierWeeks', { range: earlierRange }) }}
            </button>
          </section>

          <section v-if="showFirstPath" class="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
            <div class="flex flex-col gap-1.5">
              <h2 v-if="sizeClass === 'expanded'" class="text-xl font-semibold text-ink">{{ t('engagement.studentScreen.firstPathTitle') }}</h2>
              <p class="text-xs text-ink-muted">{{ t('engagement.studentScreen.firstPathAssigned', { title: path.title, date: alphaDay(path.given_at, locale) }) }}</p>
              <FirstPathBar :percent="path.completed_percent" :label="pathProgress" />
              <p class="text-xs text-ink">{{ pathProgress }}</p>
            </div>
            <ol class="flex flex-col">
              <li v-for="node in observation.first_path_nodes" :key="node.position">
                <PathNodeRow data-test="path-node" :node="node" />
              </li>
            </ol>
          </section>

          <EventLog v-if="sizeClass !== 'expanded' && tab === 'events'" :student-id="studentId" :type-group="null" />
        </div>
      </template>
    </main>
  </TeachShell>
</template>
