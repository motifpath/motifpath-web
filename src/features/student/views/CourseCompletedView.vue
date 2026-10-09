<script setup lang="ts">
import { PartyPopper } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const { enrollments, isLoading, error, retry } = useMyCourseEnrollments()

// Only a course the student actually finished is celebrated: an unknown,
// in-progress or abandoned enrollment gets the not-found state instead.
const completedEnrollment = computed(
  () =>
    enrollments.value.find(
      (e) => e.course_enrollment_id === route.params.enrollmentId && e.status === 'completed',
    ) ?? null,
)
</script>

<template>
  <section class="flex flex-col gap-6">
    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <LoadFailed v-else-if="error" data-test="error" :message="t('courseCompletedView.errorMessage')" @retry="retry" />

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

    <div
      v-else
      data-test="course-completed"
      class="flex flex-col items-center gap-5 rounded-lg border border-border bg-surface-raised px-6 py-10 text-center"
    >
      <PartyPopper class="h-10 w-10 text-accent-text" aria-hidden="true" />
      <ThumbnailImage
        :url="completedEnrollment.course_thumbnail_url"
        size-class="aspect-video w-full max-w-md rounded-lg"
      />
      <div class="flex flex-col gap-2">
        <h1 class="text-xl font-semibold text-accent-text sm:text-2xl">{{ t('courseCompletedView.heading') }}</h1>
        <p class="text-ink">
          {{ t('courseCompletedView.message', { title: completedEnrollment.course_title }) }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <PrimaryButton as="RouterLink" :to="{ name: 'course-catalog' }" data-test="find-next-course">
          {{ t('courseCompletedView.findNextCourse') }}
        </PrimaryButton>
        <RouterLink :to="{ name: 'my-courses' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('courseCompletedView.myCourses') }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
