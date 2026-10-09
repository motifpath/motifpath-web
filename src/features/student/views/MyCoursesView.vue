<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import {
  type CurrentPathTarget,
  useSetCurrentPath,
} from '@/features/student/composables/useSetCurrentPath'
import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { completedCourseEnrollmentId } from '@/features/student/utils/courseCompletion'
import CourseCard from '@/shared/components/CourseCard.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type EnrollmentStatus = CourseEnrollment['status']

const STATUS_ORDER: Record<EnrollmentStatus, number> = { active: 0, completed: 1, abandoned: 2 }

const { t } = useTypedT()
const toast = useToast()

const enrollmentsState = useMyCourseEnrollments()
const standaloneState = useMyStandalonePaths()
// The current path only decides which entry is marked current; having none
// yet ('no-path') is an ordinary state, not a failure.
const currentState = useStudentPath()
useCourseCompletionRedirect(() => completedCourseEnrollmentId(currentState.data.value))
const { setCurrentPath } = useSetCurrentPath()

const isLoading = computed(
  () =>
    enrollmentsState.isLoading.value ||
    standaloneState.isLoading.value ||
    currentState.isLoading.value,
)
const currentFailed = computed(() => currentState.error.value === 'load-failed')
const hasError = computed(
  () => enrollmentsState.error.value || standaloneState.error.value || currentFailed.value,
)

function retry() {
  if (enrollmentsState.error.value) void enrollmentsState.retry()
  if (standaloneState.error.value) void standaloneState.retry()
  if (currentFailed.value) void currentState.retry()
}

const enrollments = computed(() =>
  [...enrollmentsState.enrollments.value].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  ),
)
const activePaths = computed(() => standaloneState.paths.value.filter((p) => !p.archived_at))
const archivedPaths = computed(() => standaloneState.paths.value.filter((p) => !!p.archived_at))
const isEmpty = computed(
  () => enrollments.value.length === 0 && standaloneState.paths.value.length === 0,
)

const currentEnrollmentId = computed(() => currentState.data.value?.course_enrollment_id ?? null)
const currentStandalonePathId = computed(() =>
  currentState.data.value && !currentState.data.value.course_enrollment_id
    ? currentState.data.value.student_path_id
    : null,
)

function enrollmentMeta(enrollment: CourseEnrollment): string {
  if (enrollment.status === 'completed') return t('myCoursesView.statusCompleted')
  if (enrollment.status === 'abandoned') return t('myCoursesView.statusAbandoned')
  return enrollment.active_checkpoint_position && enrollment.checkpoint_count !== undefined
    ? t('myCoursesView.learningPath', {
        position: enrollment.active_checkpoint_position,
        count: enrollment.checkpoint_count,
      })
    : ''
}

// A path the learner enrolled in themselves needs no "assigned by" line.
function assignedBySomeoneElse(path: StudentPath): boolean {
  return path.assigned_by.user_id !== path.student.user_id
}

const switching = ref(false)

// What is current now, as a target to come back to; null when nothing is.
function currentTarget(): CurrentPathTarget | null {
  const data = currentState.data.value
  if (!data) return null
  return data.course_enrollment_id
    ? { courseEnrollmentId: data.course_enrollment_id }
    : { studentPathId: data.student_path_id }
}

// The switch answers with the new current path, so the list re-marks it in place: reloading would
// swap the whole list for a skeleton and lose the scroll position and keyboard focus.
async function makeCurrent(target: CurrentPathTarget) {
  currentState.data.value = await setCurrentPath(target)
}

// Switching is reversible, so it happens at once with an Undo, never behind a confirm.
async function switchTo(target: CurrentPathTarget, title: string) {
  const previous = currentTarget()
  switching.value = true
  try {
    await makeCurrent(target)
    toast.neutral(
      t('myCoursesView.switchedToast', { title }),
      previous ? { action: { label: t('myCoursesView.undo'), run: () => void undo(previous) } } : {},
    )
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    switching.value = false
  }
}

async function undo(previous: CurrentPathTarget) {
  try {
    await makeCurrent(previous)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-accent-text sm:text-2xl">{{ t('myCoursesView.heading') }}</h1>
      <div v-if="!isEmpty" class="flex flex-wrap gap-4">
        <RouterLink :to="{ name: 'course-catalog' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('myCoursesView.findAnotherCourse') }}
        </RouterLink>
        <RouterLink :to="{ name: 'path-catalog' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('myCoursesView.findPath') }}
        </RouterLink>
      </div>
    </div>

    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <LoadFailed
      v-else-if="hasError"
      data-test="error"
      :message="t('myCoursesView.errorMessage')"
      @retry="retry"
    />

    <StateBlock
      v-else-if="isEmpty"
      data-test="empty"
      kind="empty"
      :title="t('myCoursesView.emptyHeading')"
      :message="t('myCoursesView.emptyMessage')"
    >
      <template #action>
        <div class="flex flex-wrap justify-center gap-4">
          <RouterLink :to="{ name: 'course-catalog' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('myCoursesView.browseCatalog') }}
          </RouterLink>
          <RouterLink :to="{ name: 'path-catalog' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('myCoursesView.browsePathCatalog') }}
          </RouterLink>
        </div>
      </template>
    </StateBlock>

    <template v-else>
      <div v-if="enrollments.length" class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold text-ink">{{ t('myCoursesView.coursesHeading') }}</h2>
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li v-for="enrollment in enrollments" :key="enrollment.course_enrollment_id">
            <CourseCard
              data-test="my-course-item"
              :title="enrollment.course_title"
              :summary="enrollment.course_summary"
              :created-by="enrollment.course_created_by"
              :level="enrollment.course_level"
              :checkpoint-count="enrollment.checkpoint_count"
              :thumbnail-url="enrollment.course_thumbnail_url"
            >
              <template #supporting>
                <p class="text-sm text-ink-muted">{{ enrollmentMeta(enrollment) }}</p>
              </template>
              <template #actions>
                <template v-if="enrollment.course_enrollment_id === currentEnrollmentId">
                  <span data-test="current" class="flex items-center gap-1 text-sm font-semibold text-success">
                    <Check :size="16" aria-hidden="true" />
                    {{ t('myCoursesView.current') }}
                  </span>
                  <span data-test="open">
                    <RouterLink :to="{ name: 'path' }" class="text-sm font-semibold text-accent-text underline">
                      {{ t('myCoursesView.open') }}
                    </RouterLink>
                  </span>
                </template>
                <PrimaryButton
                  v-else-if="enrollment.status === 'active'"
                  data-test="switch"
                  :disabled="switching"
                  @click="switchTo({ courseEnrollmentId: enrollment.course_enrollment_id }, enrollment.course_title)"
                >
                  {{ t('myCoursesView.switch') }}
                </PrimaryButton>
              </template>
            </CourseCard>
          </li>
        </ul>
      </div>

      <div v-if="activePaths.length" class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold text-ink">{{ t('myCoursesView.pathsHeading') }}</h2>
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li v-for="path in activePaths" :key="path.student_path_id">
            <CourseCard
              kind="path"
              data-test="my-course-item"
              :title="path.title"
              :summary="path.summary"
              :created-by="path.created_by"
              :level="path.level"
              :thumbnail-url="path.thumbnail_url"
            >
              <template #supporting>
                <p data-test="path-progress" class="text-sm text-ink-muted">
                  {{ t('myCoursesView.pathProgress', { completed: path.completed_count, count: path.lesson_count }) }}
                </p>
                <p v-if="assignedBySomeoneElse(path)" class="text-sm text-ink-muted">
                  {{ t('myCoursesView.assignedBy', { name: path.assigned_by.display_name }) }}
                </p>
              </template>
              <template #actions>
                <template v-if="path.student_path_id === currentStandalonePathId">
                  <span data-test="current" class="flex items-center gap-1 text-sm font-semibold text-success">
                    <Check :size="16" aria-hidden="true" />
                    {{ t('myCoursesView.current') }}
                  </span>
                  <span data-test="open">
                    <RouterLink :to="{ name: 'path' }" class="text-sm font-semibold text-accent-text underline">
                      {{ t('myCoursesView.open') }}
                    </RouterLink>
                  </span>
                </template>
                <PrimaryButton
                  v-else
                  data-test="switch"
                  :disabled="switching"
                  @click="switchTo({ studentPathId: path.student_path_id }, path.title)"
                >
                  {{ t('myCoursesView.switch') }}
                </PrimaryButton>
              </template>
            </CourseCard>
          </li>
        </ul>
      </div>

      <div v-if="archivedPaths.length" data-test="archived-paths" class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('myCoursesView.archivedHeading') }}
        </h3>
        <ul class="flex flex-col gap-1">
          <li
            v-for="path in archivedPaths"
            :key="path.student_path_id"
            class="text-sm text-ink-muted"
          >
            {{ path.title }}
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
