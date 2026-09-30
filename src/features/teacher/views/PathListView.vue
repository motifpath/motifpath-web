<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'

import {
  type LearningPathStatus,
  useLearningPathLibrary,
} from '@/features/teacher/composables/useLearningPathLibrary'
import AppBar from '@/shared/components/AppBar.vue'
import CourseCard from '@/shared/components/CourseCard.vue'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const STATUS_TABS: (LearningPathStatus | null)[] = [null, 'draft', 'published']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)
// A teacher's library is only their own paths, so only an admin gets a
// creator filter.
const isAdmin = computed(() => currentUser.profile?.role === 'admin')

const { isCompact } = useIsCompact()
const { t } = useTypedT()
const {
  paths,
  total,
  status,
  filters,
  searchText,
  hasActiveFilters,
  clearFilters,
  isLoading,
  isLoadingMore,
  error,
  loadMoreError,
  retry,
  loadMore,
} = useLearningPathLibrary()
const { instrumentsLabel } = useInstrumentNames()

function statusLabel(tab: LearningPathStatus | null): string {
  return tab ? t(`pathStatus.${tab}`) : t('pathListView.allStatuses')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'teacher-paths' }" />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('pathListView.permissionDenied') }}
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-lg font-bold text-ink sm:text-xl">{{ t('pathListView.heading') }}</h1>
        <RouterLink
          :to="{ name: 'teacher-path-new' }"
          data-test="new-learning-path"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('pathListView.newPathLabel') }}
        </RouterLink>
      </div>

      <div role="tablist" :aria-label="t('pathListView.statusTabsLabel')" class="flex flex-wrap gap-1">
        <button
          v-for="tab in STATUS_TABS"
          :key="tab ?? 'all'"
          type="button"
          role="tab"
          :data-test="`status-tab-${tab ?? 'all'}`"
          :aria-selected="status === tab"
          class="rounded-full px-3.5 py-1.5 text-sm font-semibold"
          :class="status === tab ? 'bg-accent-muted text-accent-text' : 'text-ink-muted'"
          @click="status = tab"
        >
          {{ statusLabel(tab) }}
        </button>
      </div>

      <CourseFilters
        v-model:search-text="searchText"
        v-model:levels="filters.levels"
        v-model:skill-ids="filters.skillIds"
        v-model:concept-ids="filters.conceptIds"
        v-model:teacher="filters.teacher"
        v-model:instrument-id="filters.instrumentId"
        v-model:language="filters.language"
        instrument-filter
        language-filter
        :teacher-scope="isAdmin ? 'path-library' : null"
        :search-placeholder="t('pathListView.searchPlaceholder')"
        :has-active-filters="hasActiveFilters"
        @clear="clearFilters"
      />

      <StateLoading v-if="isLoading" data-test="loading" :noun="t('pathListView.loadingNoun')" />

      <StateError v-else-if="error" data-test="error" :message="t('pathListView.errorMessage')" @retry="retry" />

      <StateEmpty
        v-else-if="paths.length === 0 && hasActiveFilters"
        data-test="no-matches"
        :heading="t('pathListView.noMatchesHeading')"
        :message="t('pathListView.noMatchesMessage')"
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
      </StateEmpty>

      <StateEmpty
        v-else-if="paths.length === 0"
        data-test="empty"
        :heading="t('pathListView.emptyHeading')"
        :message="t('pathListView.emptyMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'teacher-path-new' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('pathListView.newPathLabel') }}
          </RouterLink>
        </template>
      </StateEmpty>

      <template v-else>
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li v-for="learningPath in paths" :key="learningPath.learning_path_id">
            <CourseCard
              kind="path"
              data-test="learning-path-row"
              :title="learningPath.title"
              :summary="learningPath.summary"
              :created-by="learningPath.teacher"
              :level="learningPath.level"
              :language="learningPath.language"
              :lesson-count="learningPath.items.length"
              :thumbnail-url="learningPath.thumbnail_url"
            >
              <template #badges>
                <span data-test="path-status" class="rounded-full bg-accent-muted px-2.5 py-0.5 text-accent-text">
                  {{ t(`pathStatus.${learningPath.status}`) }}
                </span>
                <span data-test="path-instruments" class="rounded-full bg-surface-sunken px-2.5 py-0.5">
                  {{ instrumentsLabel(learningPath.instrument_ids) }}
                </span>
              </template>
              <template #actions>
                <span data-test="edit-path">
                  <RouterLink
                    :to="{ name: 'teacher-path-edit', params: { id: learningPath.learning_path_id } }"
                    class="text-sm font-semibold text-accent-text underline"
                  >
                    {{ t('pathListView.editPath') }}
                  </RouterLink>
                </span>
              </template>
            </CourseCard>
          </li>
        </ul>
        <LoadMoreButton
          :loaded="paths.length"
          :total="total"
          :loading="isLoadingMore"
          :failed="loadMoreError"
          @load="loadMore"
        />
      </template>
    </div>
  </div>
</template>
