<script setup lang="ts">
import { computed } from 'vue'

import PathContent from '@/features/student/components/PathContent.vue'
import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'
import { usePathCourse } from '@/features/student/composables/usePathCourse'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { completedCourseEnrollmentId, isStandalonePathComplete } from '@/features/student/utils/courseCompletion'
import AppButton from '@/shared/components/AppButton.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { data, error, isLoading, retry } = useStudentPath()
const course = usePathCourse(data)
const { t } = useTypedT()

useCourseCompletionRedirect(() => completedCourseEnrollmentId(data.value))

const complete = computed(() => data.value !== null && isStandalonePathComplete(data.value))
</script>

<template>
  <section class="mx-auto flex w-full max-w-[35rem] flex-col gap-5">
    <template v-if="isLoading">
      <h1 class="sr-only">{{ t('pathView.heading') }}</h1>
      <LoadingSkeleton data-test="loading" />
    </template>

    <StateBlock
      v-else-if="error === 'no-path'"
      data-test="no-path"
      kind="empty"
      :title="t('pathView.empty.title')"
      :message="t('pathView.empty.message')"
    >
      <template #action>
        <PrimaryButton as="RouterLink" :to="{ name: 'course-catalog' }">{{ t('pathView.empty.action') }}</PrimaryButton>
      </template>
    </StateBlock>

    <template v-else-if="error">
      <h1 class="text-lg font-semibold text-ink">{{ t('pathView.heading') }}</h1>
      <LoadFailed data-test="error" :message="t('pathView.errorMessage')" @retry="retry()" />
    </template>

    <template v-else-if="data">
      <div
        v-if="complete"
        data-test="path-complete"
        class="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-raised px-5 py-6 text-center"
      >
        <h2 class="text-lg font-semibold text-ink">{{ t('pathView.complete.title', { title: data.title }) }}</h2>
        <p class="text-sm text-ink-muted">{{ t('pathView.complete.message', { total: data.items.length }) }}</p>
        <PrimaryButton as="RouterLink" :to="{ name: 'path-catalog' }" data-test="find-next-path" class="w-full">
          {{ t('pathView.complete.findNext') }}
        </PrimaryButton>
        <AppButton variant="tertiary" :to="{ name: 'practice-session' }" data-test="practise" block>
          {{ t('pathView.complete.practise') }}
        </AppButton>
      </div>

      <PathContent :view="data" :course="course" />
    </template>
  </section>
</template>
