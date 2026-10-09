<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import { type DiagramScope, useDiagramLibrary } from '@/features/teacher/composables/useDiagramLibrary'
import AppBar from '@/shared/components/AppBar.vue'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
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
const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const scopes: DiagramScope[] = ['all', 'templates', 'mine']

const {
  diagrams,
  total,
  scope,
  filters,
  searchText,
  rootNote,
  hasActiveFilters,
  clearFilters,
  isLoading,
  isLoadingMore,
  error,
  loadMoreError,
  reload,
  loadMore,
} = useDiagramLibrary(currentUser.profile?.user_id)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar :compact="isCompact" :primary-nav-to="{ name: 'teacher-diagrams' }" />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('common.permissionDenied') }}
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-ink sm:text-xl">{{ t('diagramListView.heading') }}</h1>
        <RouterLink
          :to="{ name: 'teacher-diagram-new' }"
          data-test="new-diagram"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('common.newDiagram') }}
        </RouterLink>
      </div>

      <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="group" :aria-label="t('diagramListView.scopeLabel')">
        <button
          v-for="option in scopes"
          :key="option"
          type="button"
          :data-test="`filter-${option}`"
          :aria-pressed="scope === option"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="scope === option ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="scope = option"
        >
          {{ t(`diagramListView.scopes.${option}`) }}
        </button>
      </div>

      <CourseFilters
        v-model:search-text="searchText"
        v-model:levels="filters.levels"
        v-model:skill-ids="filters.skillIds"
        v-model:concept-ids="filters.conceptIds"
        v-model:instrument-id="filters.instrumentId"
        v-model:language="filters.language"
        instrument-filter
        language-filter
        :level-filter="false"
        single-classification
        :search-placeholder="t('diagramListView.searchPlaceholder')"
        :has-active-filters="hasActiveFilters"
        @clear="clearFilters"
      >
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('diagramListView.rootNoteFilterLabel') }}
          </span>
          <input
            v-model="rootNote"
            data-test="root-note-filter"
            type="text"
            maxlength="3"
            :placeholder="t('diagramListView.rootNotePlaceholder')"
            class="w-32 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-ink"
          />
        </label>
      </CourseFilters>

      <LoadingSkeleton v-if="isLoading" data-test="loading" />

      <LoadFailed v-else-if="error" data-test="error" :message="t('diagramListView.loadErrorMessage')" @retry="reload" />

      <StateBlock
        v-else-if="diagrams.length === 0 && hasActiveFilters"
        data-test="no-matches"
        kind="empty"
        :title="t('diagramListView.noMatchesHeading')"
        :message="t('diagramListView.noMatchesMessage')"
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
        v-else-if="diagrams.length === 0"
        data-test="empty"
        kind="empty"
        :title="t('diagramListView.emptyHeading')"
        :message="t('diagramListView.emptyMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'teacher-diagram-new' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('common.newDiagram') }}
          </RouterLink>
        </template>
      </StateBlock>

      <template v-else>
        <ul class="flex flex-col gap-2">
          <li v-for="diagram in diagrams" :key="diagram.diagram_id">
            <RouterLink
              :to="{ name: 'teacher-diagram-edit', params: { id: diagram.diagram_id } }"
              data-test="diagram-row"
              class="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3"
            >
              <span class="font-semibold text-ink">{{ localizedName(diagram.names) }}</span>
              <span
                v-if="diagram.kind === 'basic'"
                data-test="template-badge"
                class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
              >{{ t('diagramListView.templateBadge') }}</span>
            </RouterLink>
          </li>
        </ul>
        <LoadMoreButton
          :loaded="diagrams.length"
          :total="total"
          :loading="isLoadingMore"
          :failed="loadMoreError"
          @load="loadMore"
        />
      </template>
    </div>
  </div>
</template>
