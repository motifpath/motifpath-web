<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import PartRow from '@/features/student/components/PartRow.vue'
import { useEnrollInCourse } from '@/features/student/composables/useEnrollInCourse'
import {
  LeaveFailedAfterSwitchError,
  useLeaveLearningItem,
} from '@/features/student/composables/useLeaveLearningItem'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { usePublishedCourse } from '@/features/student/composables/usePublishedCourse'
import { type CurrentPathTarget, useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { discoverBackLink } from '@/features/student/utils/catalogReturn'
import { buildCourseOutline, courseStanding } from '@/features/student/utils/courseOutline'
import { buildLearning, nextInProgress } from '@/features/student/utils/learning'
import { whereToStartReturn } from '@/features/student/utils/whereToStartReturn'
import AppButton from '@/shared/components/AppButton.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import ProgressMeter from '@/shared/components/ProgressMeter.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import StatusChip from '@/shared/components/StatusChip.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

const route = useRoute()
const router = useRouter()
const { t } = useTypedT()
const toast = useToast()
const { instrumentsLabel } = useInstrumentNames()

const courseId = String(route.params.courseId)
const { course, isLoading: courseLoading, error: courseError, notFound, retry: retryCourse } = usePublishedCourse(courseId)
const enrollmentState = useMyCourseEnrollments()
// The standalone paths and the current path only decide what comes next after leaving and how far
// the current part has got, so the page doesn't wait for them.
const standaloneState = useMyStandalonePaths()
const currentState = useStudentPath()
const { enrollInCourse } = useEnrollInCourse()
const { setCurrentPath } = useSetCurrentPath()
const { leave } = useLeaveLearningItem()

const isLoading = computed(() => courseLoading.value || enrollmentState.isLoading.value)
const hasError = computed(() => courseError.value || enrollmentState.error.value)

function retry() {
  if (courseError.value) void retryCourse()
  if (enrollmentState.error.value) void enrollmentState.retry()
}

// ── The way back ──────────────────────────────────────────────────────────

// Opened from Learning, the way back is there; from a new student's Where to start, there; otherwise
// the catalog, at the course the student came from.
const back = computed<{ title: string; label: string; to: RouteLocationRaw }>(() => {
  if (route.name === 'learning-course') {
    return { title: t('nav.learning'), label: t('courseDetailView.backToLearning'), to: { name: 'my-courses' } }
  }
  const whereToStart = whereToStartReturn(route.query)
  if (whereToStart) {
    return { title: t('firstRun.backToWhereToStart'), label: t('courseDetailView.backToWhereToStart'), to: whereToStart }
  }
  return {
    title: t('nav.discover'),
    label: t('courseDetailView.backToDiscover'),
    to: discoverBackLink('courses', courseId),
  }
})

// ── Where the student stands ──────────────────────────────────────────────

const standing = computed(() => courseStanding(enrollmentState.enrollments.value, courseId))
const enrollment = computed(() => (standing.value.kind === 'enrolled' ? standing.value.enrollment : null))
const outline = computed(() =>
  course.value ? buildCourseOutline(course.value, standing.value, currentState.data.value) : [],
)
const activePosition = computed(() => enrollment.value?.active_checkpoint_position ?? 1)
const partCount = computed(() => course.value?.checkpoint_count ?? outline.value.length)

const chips = computed(() => {
  if (!course.value) return []
  const languageKey = languageLabelKey(course.value.language)
  return [
    t(`levels.${course.value.level}`),
    languageKey ? t(languageKey) : course.value.language,
    ...(course.value.instrument_ids.length ? [instrumentsLabel(course.value.instrument_ids)] : []),
  ]
})

const outlineHeading = computed(() => {
  const heading = t('courseDetailView.outline')
  if (standing.value.kind !== 'none' && standing.value.kind !== 'left') return heading
  const lessons = course.value?.lesson_count ?? outline.value.reduce((sum, part) => sum + part.lessonCount, 0)
  return `${heading} · ${t('courseDetailView.parts', { count: partCount.value })} · ${t('partRow.lessons', { count: lessons })}`
})

// Which parts are unfolded; the current one opens unfolded.
const unfolded = ref(new Set<number>())
watch(
  () => outline.value.find((part) => part.state === 'current')?.position,
  (position) => {
    if (position !== undefined) unfolded.value = new Set([...unfolded.value, position])
  },
  { immediate: true },
)

function toggle(position: number) {
  const next = new Set(unfolded.value)
  if (!next.delete(position)) next.add(position)
  unfolded.value = next
}

// ── Starting and continuing ───────────────────────────────────────────────

const starting = ref(false)

async function start() {
  if (!course.value) return
  starting.value = true
  try {
    const result = await enrollInCourse(course.value.course_id)
    if (result.outcome === 'enrolled') {
      enrollmentState.enrollments.value = [...enrollmentState.enrollments.value, result.enrollment]
      toast.success(t('courseDetailView.enrolledToast', { title: course.value.title }))
    } else {
      await enrollmentState.retry()
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    starting.value = false
  }
}

function currentTarget(): CurrentPathTarget | null {
  const data = currentState.data.value
  if (!data) return null
  return data.course_enrollment_id ? { courseEnrollmentId: data.course_enrollment_id } : { studentPathId: data.student_path_id }
}

const continuing = ref(false)

// Continuing opens My path on this course, making it current first when it isn't. Switching is
// reversible, so it happens at once with an Undo, as from a Learning row.
async function continueCourse() {
  const active = enrollment.value
  if (!active || !course.value || continuing.value) return
  if (currentState.data.value?.course_enrollment_id === active.course_enrollment_id) {
    void router.push({ name: 'path' })
    return
  }

  const previous = currentTarget()
  const title = course.value.title
  continuing.value = true
  try {
    currentState.data.value = await setCurrentPath({ courseEnrollmentId: active.course_enrollment_id })
    toast.neutral(
      t('learningView.nowOn', { title }),
      previous ? { action: { label: t('learningView.undo'), run: () => void undo(previous) } } : {},
    )
    void router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    continuing.value = false
  }
}

async function undo(previous: CurrentPathTarget) {
  try {
    currentState.data.value = await setCurrentPath(previous)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  }
}

// ── Leaving ───────────────────────────────────────────────────────────────

const learning = computed(() =>
  buildLearning(enrollmentState.enrollments.value, standaloneState.paths.value, currentState.data.value),
)
const learningItem = computed(() => {
  const id = enrollment.value?.course_enrollment_id
  return id ? (learning.value.inProgress.find((item) => item.key === `course:${id}`) ?? null) : null
})
const leaveNext = computed(() => (learningItem.value ? nextInProgress(learning.value, learningItem.value) : null))
const confirmingLeave = ref(false)
const leaveBusy = ref(false)

const leaveMessage = computed(() => {
  const message = t('learningView.leaveCourseMessage')
  return learningItem.value?.state === 'current' && leaveNext.value
    ? `${message} ${t('learningView.continueWith', { title: leaveNext.value.title })}`
    : message
})

async function confirmLeave() {
  const item = learningItem.value
  if (!item) return
  const next = leaveNext.value
  leaveBusy.value = true
  try {
    const result = await leave(item, next)
    const left = result.enrollment
    if (left) {
      enrollmentState.enrollments.value = enrollmentState.enrollments.value.map((e) =>
        e.course_enrollment_id === left.course_enrollment_id ? left : e,
      )
    }
    if (result.current !== undefined) currentState.data.value = result.current
  } catch (e) {
    if (e instanceof LeaveFailedAfterSwitchError) {
      currentState.data.value = e.current
      toast.error(t('learningView.leaveFailedAfterSwitch', { now: next?.title ?? '', title: item.title }))
    } else {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  } finally {
    leaveBusy.value = false
    confirmingLeave.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <template v-else-if="notFound">
      <PageBackBar :title="back.title" :to="back.to" :back-label="back.label" />
      <StateBlock
        data-test="not-found"
        kind="notFound"
        :title="t('courseDetailView.notFoundHeading')"
        :message="t('courseDetailView.notFoundMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'course-catalog' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('nav.findCourse') }}
          </RouterLink>
        </template>
      </StateBlock>
    </template>

    <template v-else-if="hasError">
      <PageBackBar :title="back.title" :to="back.to" :back-label="back.label" />
      <LoadFailed data-test="error" :message="t('courseDetailView.errorMessage')" @retry="retry" />
    </template>

    <!-- One 560 px column on a phone and a tablet, in reading order. From a 1120 px window, where
         both fit beside the sidebar, the outline takes a 600 px pane and the picture, progress and
         actions a 320 px card that stays in view; the same elements, regrouped. -->
    <div
      v-else-if="course"
      class="flex w-full max-w-[35rem] flex-col gap-4 min-[1120px]:grid min-[1120px]:max-w-[59rem] min-[1120px]:grid-cols-[minmax(0,37.5rem)_20rem] min-[1120px]:items-start min-[1120px]:gap-x-6"
    >
      <div class="contents min-[1120px]:flex min-[1120px]:flex-col min-[1120px]:gap-4">
        <PageBackBar :title="back.title" :to="back.to" :back-label="back.label" />

        <div class="order-2 flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <StatusChip
              v-if="standing.kind === 'finished'"
              data-test="finished-chip"
              tone="success"
              :label="t('courseDetailView.finished')"
            />
            <StatusChip v-for="(chip, index) in chips" :key="index" data-test="course-chip" :label="chip" />
          </div>
          <h1 data-test="course-detail-title" class="text-xl font-semibold text-ink">{{ course.title }}</h1>
          <p v-if="course.created_by" data-test="course-detail-byline" class="text-xs text-ink-muted">
            {{ t('courseCard.byline', { name: course.created_by.display_name }) }}
          </p>
          <p data-test="course-detail-summary" class="text-base text-ink-muted">{{ course.summary }}</p>
        </div>

        <div v-if="outline.length" class="order-4 flex flex-col gap-2">
          <h2 data-test="outline-heading" class="text-lg font-semibold text-ink">{{ outlineHeading }}</h2>
          <ol class="flex flex-col gap-2">
            <li v-for="part in outline" :key="part.position">
              <PartRow :part="part" :expanded="unfolded.has(part.position)" @toggle="toggle(part.position)">
                <button
                  v-if="part.state === 'current'"
                  type="button"
                  data-test="open-in-path"
                  class="w-fit text-sm font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  @click="continueCourse"
                >
                  {{ t('courseDetailView.openInPath') }}
                </button>
              </PartRow>
            </li>
          </ol>
        </div>
      </div>

      <div
        class="contents min-[1120px]:sticky min-[1120px]:top-5 min-[1120px]:flex min-[1120px]:flex-col min-[1120px]:gap-3 min-[1120px]:rounded-lg min-[1120px]:border min-[1120px]:border-border min-[1120px]:bg-surface-raised min-[1120px]:p-4"
      >
        <ThumbnailImage class="order-1" :url="course.thumbnail_url" size-class="aspect-video w-full rounded-lg" />

        <div class="order-3 flex flex-col gap-3">
          <div v-if="enrollment" data-test="course-progress">
            <ProgressMeter
              :completed="activePosition - 1"
              :total="partCount"
              :label="t('learningCard.part', { position: activePosition, count: partCount })"
              :summary="t('learningCard.partsSummary', { completed: activePosition - 1, count: partCount })"
            />
          </div>
          <div v-else-if="standing.kind === 'finished'" data-test="course-progress">
            <ProgressMeter
              :completed="partCount"
              :total="partCount"
              tone="success"
              :label="t('learningCard.parts', { completed: partCount, count: partCount })"
              :summary="t('learningCard.partsSummary', { completed: partCount, count: partCount })"
            />
          </div>

          <AppButton v-if="enrollment" data-test="continue" block :busy="continuing" @click="continueCourse">
            {{ t('courseDetailView.continuePart', { position: activePosition }) }}
          </AppButton>
          <AppButton
            v-else-if="standing.kind === 'finished'"
            data-test="practise"
            variant="secondary"
            block
            :to="{ name: 'practice-session' }"
          >
            {{ t('courseDetailView.practise') }}
          </AppButton>
          <template v-else>
            <AppButton data-test="start" block :busy="starting" @click="start">
              {{ t('courseDetailView.start') }}
            </AppButton>
            <p v-if="standing.kind === 'left'" data-test="left-before" class="text-xs text-ink-muted">
              {{ t('courseDetailView.leftBefore') }}
            </p>
          </template>
        </div>

        <!-- Last on the page on a phone; in the side card beside the outline on a wide screen. -->
        <button
          v-if="enrollment"
          type="button"
          data-test="leave"
          class="order-5 min-h-12 w-fit rounded-full px-3 text-sm font-semibold text-danger hover:bg-danger-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus min-[1120px]:w-full"
          @click="confirmingLeave = true"
        >
          {{ t('courseDetailView.leave') }}
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmingLeave"
      :title="t('learningView.leaveCourseTitle', { title: course?.title ?? '' })"
      :message="leaveMessage"
      :confirm-label="t('learningView.leaveCourseConfirm')"
      :busy="leaveBusy"
      @confirm="confirmLeave"
      @cancel="confirmingLeave = false"
    />
  </section>
</template>
