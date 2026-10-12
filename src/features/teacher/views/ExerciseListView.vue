<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import AuthoringList from '@/features/teacher/components/AuthoringList.vue'
import { useAuthoringFilterLabels } from '@/features/teacher/composables/useAuthoringFilterLabels'
import AuthoringRow from '@/shared/components/AuthoringRow.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

type Exercise = components['schemas']['Exercise']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { t } = useTypedT()
const { typeLabel, languageLabel } = useAuthoringFilterLabels()
const { instrumentsLabel } = useInstrumentNames()

/** The type, the instruments and the languages: "Audio recognition · Guitar · English". */
function meta(exercise: Exercise): string {
  const languages = exercise.languages.map((language) => languageLabel(language.code)).join(', ')
  return [typeLabel(exercise.exercise_type), instrumentsLabel(exercise.instrument_ids), languages]
    .filter((part) => part !== '')
    .join(' · ')
}
</script>

<template>
  <TeachShell section="teacher-exercises">
    <div class="flex flex-1 flex-col bg-surface">
      <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
        <p class="max-w-md text-center text-ink-muted">{{ t('common.permissionDenied') }}</p>
      </div>

      <div v-else class="flex flex-1 flex-col px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
        <AuthoringList
          section="exercises"
          :title="t('exerciseListView.heading')"
          :new-label="t('common.newExercise')"
          :new-to="{ name: 'teacher-exercise-new' }"
          editor-route="teacher-exercise-edit"
          :empty-title="t('exerciseListView.emptyHeading')"
          :empty-message="t('exerciseListView.emptyMessage')"
          :load-failed-message="t('exerciseListView.loadErrorMessage')"
        >
          <template #item="{ item }">
            <AuthoringRow
              :title="item.title"
              :meta="meta(item)"
              :status="null"
              :to="{ name: 'teacher-exercise-edit', params: { id: item.exercise_id } }"
            />
          </template>
        </AuthoringList>
      </div>
    </div>
  </TeachShell>
</template>
