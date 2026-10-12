<script setup lang="ts">
import { computed } from 'vue'

import AuthoringList from '@/features/teacher/components/AuthoringList.vue'
import { useAuthoringStatusChip } from '@/features/teacher/composables/useAuthoringStatusChip'
import { useCollectionMeta } from '@/features/teacher/composables/useCollectionMeta'
import AuthoringRow from '@/shared/components/AuthoringRow.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { t } = useTypedT()
const { courseStatus } = useAuthoringStatusChip()
const collectionMeta = useCollectionMeta()
</script>

<template>
  <TeachShell section="teacher-courses">
    <div class="flex flex-1 flex-col bg-surface">
      <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
        <p class="max-w-md text-center text-ink-muted">{{ t('courseListView.permissionDenied') }}</p>
      </div>

      <div v-else class="flex flex-1 flex-col px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
        <AuthoringList
          section="courses"
          :title="t('courseListView.heading')"
          :new-label="t('courseListView.newCourse')"
          :new-to="{ name: 'teacher-course-new' }"
          :empty-title="t('courseListView.emptyHeading')"
          :empty-message="t('courseListView.emptyMessage')"
          :load-failed-message="t('courseListView.errorMessage')"
        >
          <template #item="{ item }">
            <AuthoringRow
              :title="item.title"
              :meta="collectionMeta({ ...item, lessonCount: item.lesson_count })"
              :status="courseStatus(item)"
              :to="{ name: 'teacher-course-edit', params: { id: item.course_id } }"
            >
              <template #leading>
                <ThumbnailImage :url="item.thumbnail_url" size-class="h-14 w-14 rounded-xl" />
              </template>
            </AuthoringRow>
          </template>
        </AuthoringList>
      </div>
    </div>
  </TeachShell>
</template>
