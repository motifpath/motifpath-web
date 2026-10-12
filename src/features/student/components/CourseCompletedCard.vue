<script setup lang="ts">
import { PartyPopper } from 'lucide-vue-next'
import { computed } from 'vue'

import { usePublishedCourse } from '@/features/student/composables/usePublishedCourse'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type CourseEnrollment = components['schemas']['CourseEnrollment']

const props = defineProps<{ enrollment: CourseEnrollment }>()

const { t } = useTypedT()

// The enrolment knows how many parts the course has but not how many lessons, so those come from the
// published course. If it cannot be read, the parts alone say enough and nothing asks for a retry.
const { course } = usePublishedCourse(props.enrollment.course_id)

const size = computed(() => {
  const parts = props.enrollment.checkpoint_count ?? course.value?.checkpoint_count
  const pieces = [
    ...(parts !== undefined ? [t('courseDetailView.parts', { count: parts })] : []),
    ...(course.value ? [t('partRow.lessons', { count: course.value.lesson_count })] : []),
  ]
  return pieces.join(' · ')
})
</script>

<template>
  <div
    data-test="course-completed"
    class="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface-raised p-5 text-center"
  >
    <ThumbnailImage :url="enrollment.course_thumbnail_url" size-class="aspect-video w-full rounded-lg" />
    <PartyPopper class="h-9 w-9 text-accent-text" aria-hidden="true" />
    <h1 class="text-lg font-semibold text-ink">
      {{ t('courseCompletedView.finished', { title: enrollment.course_title }) }}
    </h1>
    <p v-if="size" data-test="course-size" class="text-sm font-semibold text-ink">{{ size }}</p>
    <p class="text-sm text-ink-muted">{{ t('courseCompletedView.keepsComingBack') }}</p>
  </div>
</template>
