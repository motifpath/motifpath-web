<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useEnrollInCourse } from '@/features/student/composables/useEnrollInCourse'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { usePublishedCourse } from '@/features/student/composables/usePublishedCourse'
import { useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageBadge } from '@/shared/utils/languageLabels'

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
    <StateLoading v-if="isLoading" data-test="loading" :noun="t('courseDetailView.loadingNoun')" />

    <StateEmpty
      v-else-if="notFound"
      data-test="not-found"
      :heading="t('courseDetailView.notFoundHeading')"
      :message="t('courseDetailView.notFoundMessage')"
    >
      <template #action>
        <RouterLink :to="{ name: 'course-catalog' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('nav.findCourse') }}
        </RouterLink>
      </template>
    </StateEmpty>

    <StateError
      v-else-if="error"
      data-test="error"
      :message="t('courseDetailView.errorMessage')"
      @retry="retry"
    />

    <template v-else-if="course">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div class="flex flex-col gap-4">
          <ThumbnailImage :url="course.thumbnail_url" size-class="aspect-video h-auto w-full rounded-lg" />
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
            <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
              {{ languageBadge(course.language).flag }} {{ languageBadge(course.language).shortCode }}
            </span>
            <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
              {{ t(`levels.${course.level}`) }}
            </span>
          </div>
          <div>
            <h1 data-test="course-detail-title" class="text-3xl font-semibold text-ink">{{ course.title }}</h1>
            <p v-if="course.created_by" data-test="course-detail-byline" class="mt-2 text-sm text-ink-subtle">
              {{ t('courseCard.byline', { name: course.created_by.display_name }) }}
            </p>
          </div>
          <p class="text-base text-ink-muted">{{ course.summary }}</p>
          <div class="flex flex-wrap gap-3 text-sm text-ink-subtle">
            <span v-if="course.lesson_count !== undefined" data-test="course-detail-lessons">
              {{ t('courseCard.lessons', { count: course.lesson_count }) }}
            </span>
            <span v-if="course.checkpoint_count !== undefined" data-test="course-detail-checkpoints">
              {{ t('courseCard.learningPaths', { count: course.checkpoint_count }) }}
            </span>
          </div>
        </div>

        <aside class="flex h-fit flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
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
        </aside>
      </div>

      <div v-if="course.checkpoints.length" class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-ink">{{ t('courseDetailView.outlineHeading') }}</h2>
        <ol class="flex flex-col gap-3">
          <li
            v-for="checkpoint in course.checkpoints"
            :key="checkpoint.position"
            class="rounded-lg border border-border bg-surface-raised p-4"
          >
            <h3 class="font-semibold text-ink">
              {{ t('courseDetailView.learningPath', { position: checkpoint.position }) }} · {{ checkpoint.title }}
            </h3>
            <ul v-if="checkpoint.items.length" class="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              <li v-for="item in checkpoint.items" :key="item.title">{{ item.title }}</li>
            </ul>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>
