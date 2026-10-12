<script setup lang="ts">
import { usePublishedCourse } from '@/features/teacher/composables/useCourseAuthoring'
import CourseDetailContent from '@/shared/components/CourseDetailContent.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PreviewLayer from '@/shared/components/PreviewLayer.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/** What learners see of a course: its published version, on the learner's own course page. */
const props = defineProps<{ courseId: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const { outline: course, isLoading, error, retry } = usePublishedCourse(props.courseId)
</script>

<template>
  <PreviewLayer :open="true" :title="t('previewLayer.whatLearnersSee')" @close="emit('close')">
    <LoadingSkeleton v-if="isLoading" />
    <LoadFailed v-else-if="error || !course" :message="t('coursePreview.loadFailed')" @retry="retry" />
    <CourseDetailContent v-else :course="course">
      <template #action>
        <!-- Nothing can be started for real from a preview. -->
        <PrimaryButton data-test="preview-enroll" disabled>{{ t('coursePreview.enroll') }}</PrimaryButton>
      </template>
    </CourseDetailContent>
  </PreviewLayer>
</template>
