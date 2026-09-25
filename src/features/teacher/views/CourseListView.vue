<script setup lang="ts">
import { computed } from 'vue'

import {
  type CourseStatus,
  useManagedCourses,
} from '@/features/teacher/composables/useManagedCourses'
import AppBar from '@/shared/components/AppBar.vue'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const STATUS_TABS: (CourseStatus | null)[] = [null, 'draft', 'published', 'retired']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)
// A teacher's list is always only their own courses, so only an admin gets a
// teacher filter and a teacher name on each row.
const isAdmin = computed(() => currentUser.profile?.role === 'admin')

const { isCompact } = useIsCompact()
const { t } = useTypedT()
const {
  courses,
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
} = useManagedCourses()

function statusLabel(tab: CourseStatus | null): string {
  return tab ? t(`courseStatus.${tab}`) : t('courseListView.allStatuses')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'teacher-courses' }" />

    <div
      v-if="!canAuthor"
      data-test="permission-denied"
      class="flex flex-1 items-center justify-center p-10"
    >
      <p class="max-w-md text-center text-ink-muted">
        {{ t('courseListView.permissionDenied') }}
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-[48px] pb-[80px] pt-10">
      <h1 class="text-xl font-bold text-ink">{{ t('courseListView.heading') }}</h1>

      <div
        role="tablist"
        :aria-label="t('courseListView.statusTabsLabel')"
        class="flex flex-wrap gap-1"
      >
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
        :teacher-scope="isAdmin ? 'managed' : null"
        :has-active-filters="hasActiveFilters"
        @clear="clearFilters"
      />

      <StateLoading v-if="isLoading" data-test="loading" :noun="t('courseListView.loadingNoun')" />

      <StateError
        v-else-if="error"
        data-test="error"
        :message="t('courseListView.errorMessage')"
        @retry="retry"
      />

      <StateEmpty
        v-else-if="courses.length === 0 && hasActiveFilters"
        data-test="no-matches"
        :heading="t('courseListView.noMatchesHeading')"
        :message="t('courseListView.noMatchesMessage')"
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
        v-else-if="courses.length === 0"
        data-test="empty"
        :heading="t('courseListView.emptyHeading')"
        :message="t('courseListView.emptyMessage')"
      />

      <template v-else>
        <ul class="flex flex-col gap-2">
          <li
            v-for="course in courses"
            :key="course.course_id"
            data-test="course-row"
            class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-4 py-3"
          >
            <div class="flex flex-col gap-0.5">
              <span class="font-semibold text-ink">{{ course.title }}</span>
              <span v-if="isAdmin" data-test="course-teacher" class="text-sm text-ink-subtle">
                {{ t('courseListView.courseTeacher', { name: course.created_by.display_name }) }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-ink-muted">
                {{ t(`levels.${course.level}`) }}
              </span>
              <span
                data-test="course-status"
                class="rounded-full bg-accent-muted px-2.5 py-0.5 text-accent-text"
                >{{ t(`courseStatus.${course.status ?? 'draft'}`) }}</span
              >
              <span
                v-if="course.has_unpublished_changes"
                data-test="unpublished-changes"
                class="rounded-full border border-border px-2.5 py-0.5 text-ink-muted"
              >
                {{ t('courseListView.unpublishedChanges') }}
              </span>
            </div>
          </li>
        </ul>
        <LoadMoreButton
          :loaded="courses.length"
          :total="total"
          :loading="isLoadingMore"
          :failed="loadMoreError"
          @load="loadMore"
        />
      </template>
    </div>
  </div>
</template>
