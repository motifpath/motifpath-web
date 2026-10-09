<script setup lang="ts">
import { PartyPopper } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import { useTypedT } from '@/shared/composables/useTypedT'

import PathContent from '@/features/student/components/PathContent.vue'
import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { completedCourseEnrollmentId, isStandalonePathComplete } from '@/features/student/utils/courseCompletion'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'

const { data, error, isLoading, retry } = useStudentPath()
const { t } = useTypedT()

useCourseCompletionRedirect(() => completedCourseEnrollmentId(data.value))
</script>

<template>
  <section>
    <h1 class="mb-4 text-xl font-semibold text-accent-text sm:text-2xl">{{ t('pathView.heading') }}</h1>

    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <StateBlock
      v-else-if="error === 'no-path'"
      data-test="no-path"
      kind="empty"
      :title="t('pathView.emptyHeading')"
      :message="t('pathView.emptyMessage')"
    />

    <LoadFailed
      v-else-if="error"
      data-test="error"
      :message="t('pathView.errorMessage')"
      @retry="retry()"
    />

    <template v-else-if="data">
      <div
        v-if="isStandalonePathComplete(data)"
        data-test="path-complete"
        class="mb-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-raised px-6 py-8 text-center"
      >
        <PartyPopper class="h-8 w-8 text-accent-text" aria-hidden="true" />
        <h2 class="text-xl font-semibold text-accent-text">{{ t('pathView.completeHeading') }}</h2>
        <p class="text-ink">{{ t('pathView.completeMessage', { title: data.title }) }}</p>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <PrimaryButton as="RouterLink" :to="{ name: 'course-catalog' }">
            {{ t('pathView.findCourse') }}
          </PrimaryButton>
          <RouterLink :to="{ name: 'my-courses' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('pathView.myCourses') }}
          </RouterLink>
        </div>
      </div>

      <PathContent :view="data" />
    </template>
  </section>
</template>
