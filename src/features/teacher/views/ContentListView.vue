<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import AuthoringList from '@/features/teacher/components/AuthoringList.vue'
import { useAuthoringFilterLabels } from '@/features/teacher/composables/useAuthoringFilterLabels'
import { useAuthoringStatusChip } from '@/features/teacher/composables/useAuthoringStatusChip'
import AuthoringRow from '@/shared/components/AuthoringRow.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

type ContentNode = components['schemas']['ContentNode']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { t } = useTypedT()
const { typeLabel, languageLabel } = useAuthoringFilterLabels()
const { lessonStatus } = useAuthoringStatusChip()
const { instrumentsLabel } = useInstrumentNames()

/** The type, the instruments and the languages: "Video · Guitar · English". */
function meta(lesson: ContentNode): string {
  const languages = lesson.languages.map((language) => languageLabel(language.code)).join(', ')
  return [typeLabel(lesson.content_type), instrumentsLabel(lesson.instrument_ids), languages]
    .filter((part) => part !== '')
    .join(' · ')
}
</script>

<template>
  <TeachShell section="teacher-content">
    <div class="flex flex-1 flex-col bg-surface">
      <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
        <p class="max-w-md text-center text-ink-muted">{{ t('contentListView.permissionDenied') }}</p>
      </div>

      <div v-else class="flex flex-1 flex-col px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
        <AuthoringList
          section="lessons"
          :title="t('contentListView.heading')"
          :new-label="t('contentListView.newContentLabel')"
          :new-to="{ name: 'teacher-content-new' }"
          editor-route="teacher-content-edit"
          :empty-title="t('contentListView.emptyHeading')"
          :empty-message="t('contentListView.emptyMessage')"
          :load-failed-message="t('contentListView.errorMessage')"
        >
          <template #item="{ item }">
            <AuthoringRow
              :title="item.title"
              :meta="meta(item)"
              :status="lessonStatus(item)"
              :to="{ name: 'teacher-content-edit', params: { id: item.content_node_id } }"
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
