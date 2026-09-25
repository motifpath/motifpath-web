<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import {
  type CurrentPathTarget,
  useSetCurrentPath,
} from '@/features/student/composables/useSetCurrentPath'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type EnrollmentStatus = CourseEnrollment['status']

const STATUS_ORDER: Record<EnrollmentStatus, number> = { active: 0, completed: 1, abandoned: 2 }

const { t } = useTypedT()
const toast = useToast()
const router = useRouter()

const enrollmentsState = useMyCourseEnrollments()
const standaloneState = useMyStandalonePaths()
// The current path only decides which entry is marked current; having none
// yet ('no-path') is an ordinary state, not a failure.
const currentState = useStudentPath()
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
  return enrollment.active_checkpoint_position
    ? t('myCoursesView.stage', { position: enrollment.active_checkpoint_position })
    : ''
}

const switching = ref(false)

async function switchTo(target: CurrentPathTarget) {
  switching.value = true
  try {
    await setCurrentPath(target)
    await router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-accent-text">{{ t('myCoursesView.heading') }}</h1>
      <RouterLink
        v-if="!isEmpty"
        :to="{ name: 'course-catalog' }"
        class="text-sm font-semibold text-accent-text underline"
      >
        {{ t('myCoursesView.findAnotherCourse') }}
      </RouterLink>
    </div>

    <StateLoading v-if="isLoading" data-test="loading" :noun="t('myCoursesView.loadingNoun')" />

    <StateError
      v-else-if="hasError"
      data-test="error"
      :message="t('myCoursesView.errorMessage')"
      @retry="retry"
    />

    <StateEmpty
      v-else-if="isEmpty"
      data-test="empty"
      :heading="t('myCoursesView.emptyHeading')"
      :message="t('myCoursesView.emptyMessage')"
    >
      <template #action>
        <RouterLink
          :to="{ name: 'course-catalog' }"
          class="text-sm font-semibold text-accent-text underline"
        >
          {{ t('myCoursesView.browseCatalog') }}
        </RouterLink>
      </template>
    </StateEmpty>

    <template v-else>
      <div v-if="enrollments.length" class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold text-ink">{{ t('myCoursesView.coursesHeading') }}</h2>
        <ul class="flex flex-col gap-3">
          <li
            v-for="enrollment in enrollments"
            :key="enrollment.course_enrollment_id"
            data-test="my-course-item"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-4"
          >
            <div class="flex flex-col gap-1">
              <span class="font-semibold text-ink">{{ enrollment.course_title }}</span>
              <span class="text-sm text-ink-muted">{{ enrollmentMeta(enrollment) }}</span>
            </div>
            <span
              v-if="enrollment.course_enrollment_id === currentEnrollmentId"
              data-test="current"
              class="flex items-center gap-1 text-sm font-semibold text-success"
            >
              <Check :size="16" aria-hidden="true" />
              {{ t('myCoursesView.current') }}
            </span>
            <PrimaryButton
              v-else-if="enrollment.status === 'active'"
              data-test="switch"
              :disabled="switching"
              @click="switchTo({ courseEnrollmentId: enrollment.course_enrollment_id })"
            >
              {{ t('myCoursesView.switch') }}
            </PrimaryButton>
          </li>
        </ul>
      </div>

      <div v-if="activePaths.length" class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold text-ink">{{ t('myCoursesView.pathsHeading') }}</h2>
        <ul class="flex flex-col gap-3">
          <li
            v-for="path in activePaths"
            :key="path.student_path_id"
            data-test="my-course-item"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-4"
          >
            <div class="flex flex-col gap-1">
              <span class="font-semibold text-ink">{{ path.title }}</span>
              <span class="text-sm text-ink-muted">
                {{ t('myCoursesView.assignedBy', { name: path.assigned_by.display_name }) }}
              </span>
            </div>
            <span
              v-if="path.student_path_id === currentStandalonePathId"
              data-test="current"
              class="flex items-center gap-1 text-sm font-semibold text-success"
            >
              <Check :size="16" aria-hidden="true" />
              {{ t('myCoursesView.current') }}
            </span>
            <PrimaryButton
              v-else
              data-test="switch"
              :disabled="switching"
              @click="switchTo({ studentPathId: path.student_path_id })"
            >
              {{ t('myCoursesView.switch') }}
            </PrimaryButton>
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
