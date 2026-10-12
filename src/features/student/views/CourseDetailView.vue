<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useEnrollInCourse } from '@/features/student/composables/useEnrollInCourse'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { usePublishedCourse } from '@/features/student/composables/usePublishedCourse'
import { useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'
import CourseDetailContent from '@/shared/components/CourseDetailContent.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { whereToStartReturn } from '@/features/student/utils/whereToStartReturn'

type CourseEnrollment = components['schemas']['CourseEnrollment']

const route = useRoute()
const router = useRouter()
const { t } = useTypedT()
const toast = useToast()
const { course, isLoading, error, notFound, retry } = usePublishedCourse(String(route.params.courseId))
const enrollmentState = useMyCourseEnrollments()
const { enrollInCourse } = useEnrollInCourse()
const { setCurrentPath } = useSetCurrentPath()

const enrolledHere = ref<CourseEnrollment | null>(null)
const enrolling = ref(false)
const continuing = ref(false)
// Opened from a new student's Where to start, the way back is there; otherwise the catalog.
const fromWhereToStart = computed(() => whereToStartReturn(route.query))
const backToCatalog = computed(
  () =>
    fromWhereToStart.value ??
    (route.query.fromCatalog === 'true'
      ? { name: 'course-catalog', query: { returnFromCourse: String(route.params.courseId) } }
      : { name: 'course-catalog' }),
)

const activeEnrollment = computed(
  () =>
    enrolledHere.value ??
    enrollmentState.enrollments.value.find(
      (enrollment) => enrollment.course_id === course.value?.course_id && enrollment.status === 'active',
    ) ??
    null,
)

async function enroll() {
  if (!course.value) return
  enrolling.value = true
  try {
    const result = await enrollInCourse(course.value.course_id)
    if (result.outcome === 'enrolled') {
      enrolledHere.value = result.enrollment
      toast.success(t('courseDetailView.enrolledToast', { title: course.value.title }))
    } else {
      await enrollmentState.retry()
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    enrolling.value = false
  }
}

async function continueCourse() {
  if (!activeEnrollment.value) return
  continuing.value = true
  try {
    await setCurrentPath({ courseEnrollmentId: activeEnrollment.value.course_enrollment_id })
    await router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    continuing.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <RouterLink
      :to="backToCatalog"
      data-test="back-to-catalog"
      class="w-fit text-sm font-semibold text-accent-text underline"
    >
      {{ fromWhereToStart ? t('firstRun.backToWhereToStart') : t('courseDetailView.backToCatalog') }}
    </RouterLink>

    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <StateBlock
      v-else-if="notFound"
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

    <LoadFailed
      v-else-if="error"
      data-test="error"
      :message="t('courseDetailView.errorMessage')"
      @retry="retry"
    />

    <CourseDetailContent v-else-if="course" :course="course">
      <template #action>
        <PrimaryButton
          v-if="!activeEnrollment"
          data-test="enroll"
          :disabled="enrolling"
          @click="enroll"
        >
          {{ enrolling ? t('courseDetailView.enrolling') : t('courseDetailView.enroll') }}
        </PrimaryButton>
        <PrimaryButton v-else data-test="continue" :disabled="continuing" @click="continueCourse">
          {{ t('courseDetailView.continue') }}
        </PrimaryButton>
      </template>
    </CourseDetailContent>
  </section>
</template>
