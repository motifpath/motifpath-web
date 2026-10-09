<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import { type ExerciseType, useExerciseLibrary } from '@/features/teacher/composables/useExerciseLibrary'
import AppBar from '@/shared/components/AppBar.vue'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
const {
  exercises,
  total,
  filters,
  searchText,
  exerciseType,
  hasActiveFilters,
  clearFilters,
  isLoading,
  isLoadingMore,
  error,
  loadMoreError,
  retry,
  loadMore,
} = useExerciseLibrary()
const { t } = useTypedT()

const exerciseTypeLabels = computed<Record<ExerciseType, string>>(() => ({
  text_response: t('common.exerciseTypes.text_response'),
  audio_recognition: t('common.exerciseTypes.audio_recognition'),
  image_recognition: t('common.exerciseTypes.image_recognition'),
  image_choice: t('common.exerciseTypes.image_choice'),
  audio_selection: t('common.exerciseTypes.audio_selection'),
}))
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar :compact="isCompact" :primary-nav-to="{ name: 'teacher-exercises' }" />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('common.permissionDenied') }}
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-ink sm:text-xl">{{ t('exerciseListView.heading') }}</h1>
        <RouterLink
          :to="{ name: 'teacher-exercise-new' }"
          data-test="new-exercise"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('common.newExercise') }}
        </RouterLink>
      </div>

      <CourseFilters
        v-model:search-text="searchText"
        v-model:levels="filters.levels"
        v-model:skill-ids="filters.skillIds"
        v-model:concept-ids="filters.conceptIds"
        v-model:teacher="filters.teacher"
        v-model:language="filters.language"
        v-model:instrument-id="filters.instrumentId"
        instrument-filter
        teacher-scope="exercises"
        language-filter
        :level-filter="false"
        single-classification
        :search-placeholder="t('exerciseListView.searchPlaceholder')"
        :has-active-filters="hasActiveFilters"
        @clear="clearFilters"
      >
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('exerciseListView.typeFilterLabel') }}
          </span>
          <select
            v-model="exerciseType"
            data-test="exercise-type-filter"
            class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-ink"
          >
            <option :value="null">{{ t('exerciseListView.anyType') }}</option>
            <option v-for="(label, type) in exerciseTypeLabels" :key="type" :value="type">{{ label }}</option>
          </select>
        </label>
      </CourseFilters>

      <LoadingSkeleton v-if="isLoading" data-test="loading" />

      <LoadFailed v-else-if="error" data-test="error" :message="t('exerciseListView.loadErrorMessage')" @retry="retry" />

      <StateBlock
        v-else-if="exercises.length === 0 && hasActiveFilters"
        data-test="no-matches"
        kind="empty"
        :title="t('exerciseListView.noMatchesHeading')"
        :message="t('exerciseListView.noMatchesMessage')"
      >
        <template #action>
          <button
            type="button"
            data-test="clear-filters"
            class="text-sm font-semibold text-accent-text underline"
            @click="clearFilters"
          >
            {{ t('courseFilters.clearFilters') }}
          </button>
        </template>
      </StateBlock>

      <StateBlock
        v-else-if="exercises.length === 0"
        data-test="empty"
        kind="empty"
        :title="t('exerciseListView.emptyHeading')"
        :message="t('exerciseListView.emptyMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'teacher-exercise-new' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('common.newExercise') }}
          </RouterLink>
        </template>
      </StateBlock>

      <template v-else>
        <ul class="flex flex-col gap-2">
          <li v-for="exercise in exercises" :key="exercise.exercise_id">
            <RouterLink
              :to="{ name: 'teacher-exercise-edit', params: { id: exercise.exercise_id } }"
              data-test="exercise-row"
              class="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3"
            >
              <span class="flex min-w-0 flex-col">
                <span class="font-semibold text-ink">{{ exercise.title }}</span>
                <span v-if="exercise.created_by" data-test="exercise-creator" class="text-xs text-ink-subtle">{{
                  exercise.created_by.display_name
                }}</span>
              </span>
              <span class="shrink-0 text-sm text-ink-subtle">{{ exerciseTypeLabels[exercise.exercise_type] ?? exercise.exercise_type }}</span>
            </RouterLink>
          </li>
        </ul>
        <LoadMoreButton
          :loaded="exercises.length"
          :total="total"
          :loading="isLoadingMore"
          :failed="loadMoreError"
          @load="loadMore"
        />
      </template>
    </div>
  </div>
</template>
