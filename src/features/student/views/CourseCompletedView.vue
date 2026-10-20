<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import CourseCompletedCard from '@/features/student/components/CourseCompletedCard.vue'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { buildLearning } from '@/features/student/utils/learning'
import AppButton from '@/shared/components/AppButton.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const enrollmentState = useMyCourseEnrollments()
// The standalone paths decide the way on, so the page waits for them; the current path only spares
// a switch to what is already current, so it doesn't.
const standaloneState = useMyStandalonePaths()
const currentState = useStudentPath()
const { setCurrentPath } = useSetCurrentPath()

const isLoading = computed(() => enrollmentState.isLoading.value || standaloneState.isLoading.value)
const hasError = computed(() => enrollmentState.error.value || standaloneState.error.value)

function retry() {
  if (enrollmentState.error.value) void enrollmentState.retry()
  if (standaloneState.error.value) void standaloneState.retry()
}

// Only a course the student actually finished is celebrated: an unknown,
// in-progress or abandoned enrollment gets the not-found state instead.
const completedEnrollment = computed(
  () =>
    enrollmentState.enrollments.value.find(
      (e) => e.course_enrollment_id === route.params.enrollmentId && e.status === 'completed',
    ) ?? null,
)

// The way on: whatever else is in progress, in Learning's order, before a new course.
const next = computed(
  () =>
    buildLearning(enrollmentState.enrollments.value, standaloneState.paths.value, currentState.data.value)
      .inProgress[0] ?? null,
)

const continuing = ref(false)

// Nothing to undo here: what was current is the course just finished.
async function continueNext() {
  const item = next.value
  if (!item || continuing.value) return
  if (item.state === 'current') {
    void router.push({ name: 'path' })
    return
  }

  continuing.value = true
  try {
    currentState.data.value = await setCurrentPath(item.target)
    void router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    continuing.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-[560px] flex-col gap-6">
    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <LoadFailed v-else-if="hasError" data-test="error" :message="t('courseCompletedView.errorMessage')" @retry="retry" />

    <StateBlock
      v-else-if="!completedEnrollment"
      data-test="not-found"
      kind="notFound"
      :title="t('courseCompletedView.notFoundHeading')"
      :message="t('courseCompletedView.notFoundMessage')"
    >
      <template #action>
        <RouterLink :to="{ name: 'my-courses' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('courseCompletedView.myCourses') }}
        </RouterLink>
      </template>
    </StateBlock>

    <template v-else>
      <CourseCompletedCard :enrollment="completedEnrollment" />

      <div class="flex flex-col gap-3">
        <template v-if="next">
          <AppButton data-test="continue" block :busy="continuing" @click="continueNext">
            {{ t('courseCompletedView.continueItem', { title: next.title }) }}
          </AppButton>
          <AppButton data-test="find-next-course" variant="tertiary" block :to="{ name: 'course-catalog' }">
            {{ t('courseCompletedView.findNextCourse') }}
          </AppButton>
        </template>
        <template v-else>
          <AppButton data-test="find-next-course" block :to="{ name: 'course-catalog' }">
            {{ t('courseCompletedView.findNextCourse') }}
          </AppButton>
          <AppButton data-test="practise" variant="tertiary" block :to="{ name: 'practice-session' }">
            {{ t('courseDetailView.practise') }}
          </AppButton>
        </template>
      </div>
    </template>
  </section>
</template>
