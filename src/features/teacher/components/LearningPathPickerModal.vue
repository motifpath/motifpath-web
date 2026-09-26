<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import {
  type LearningPathSort,
  useLearningPathLibrary,
} from '@/features/teacher/composables/useLearningPathLibrary'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { formatDate } from '@/shared/utils/formatDate'
import { useCurrentUserStore } from '@/stores/currentUser'

type LearningPath = components['schemas']['LearningPath']

defineProps<{ open: boolean }>()
const emit = defineEmits<{ select: [path: LearningPath]; close: [] }>()

const SORTS: LearningPathSort[] = ['title', 'updated']

const { t, locale } = useTypedT()
const { instrumentsLabel } = useInstrumentNames()
const currentUser = useCurrentUserStore()

const {
  paths,
  total,
  sort,
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

// No endpoint lists the library's authors, so the author filter narrows to
// the signed-in teacher's own paths or none.
const onlyMine = computed({
  get: () => !!currentUser.profile && filters.teacher?.user_id === currentUser.profile.user_id,
  set: (checked: boolean) => {
    const profile = currentUser.profile
    filters.teacher =
      checked && profile ? { user_id: profile.user_id, display_name: profile.display_name } : null
  },
})

function onOnlyMineChange(event: Event) {
  if (event.target instanceof HTMLInputElement) onlyMine.value = event.target.checked
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[85vh] w-[min(720px,calc(100vw-32px))] flex-col gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-base font-bold">{{ t('learningPathPickerModal.title') }}</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <CourseFilters
      v-model:search-text="searchText"
      v-model:levels="filters.levels"
      v-model:skill-ids="filters.skillIds"
      v-model:concept-ids="filters.conceptIds"
      v-model:instrument-id="filters.instrumentId"
      instrument-filter
      :search-placeholder="t('learningPathPickerModal.searchPlaceholder')"
      :has-active-filters="hasActiveFilters"
      @clear="clearFilters"
    >
      <label class="flex items-center gap-2 py-2 text-sm text-ink">
        <input
          type="checkbox"
          data-test="path-only-mine"
          :checked="onlyMine"
          @change="onOnlyMineChange"
        />
        {{ t('learningPathPickerModal.onlyMine') }}
      </label>
      <div
        class="ml-auto flex items-center gap-1"
        role="group"
        :aria-label="t('learningPathPickerModal.sortLabel')"
      >
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('learningPathPickerModal.sortLabel') }}
        </span>
        <button
          v-for="option in SORTS"
          :key="option"
          type="button"
          :data-test="`path-sort-${option}`"
          :aria-pressed="sort === option ? 'true' : 'false'"
          class="rounded-full px-3 py-1 text-sm font-semibold"
          :class="sort === option ? 'bg-accent-muted text-accent-text' : 'text-ink-muted'"
          @click="sort = option"
        >
          {{ t(`learningPathPickerModal.sort.${option}`) }}
        </button>
      </div>
    </CourseFilters>

    <StateLoading v-if="isLoading" :noun="t('learningPathPickerModal.loadingNoun')" />

    <div v-else-if="error" data-test="path-picker-error">
      <StateError :message="t('learningPathPickerModal.errorMessage')" @retry="retry" />
    </div>

    <p v-else-if="paths.length === 0" data-test="path-picker-empty" class="text-sm text-ink-subtle">
      {{ t('learningPathPickerModal.emptyMessage') }}
    </p>

    <template v-else>
      <ul class="flex flex-col gap-2">
        <li v-for="path in paths" :key="path.learning_path_id">
          <button
            type="button"
            data-test="path-picker-row"
            class="flex w-full items-center gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-left hover:border-accent"
            @click="emit('select', path)"
          >
            <ThumbnailImage :url="path.thumbnail_url" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="truncate text-sm font-semibold text-ink">{{ path.title }}</span>
              <span class="text-xs text-ink-subtle">
                {{ path.teacher.display_name }} ·
                {{ path.level ? t(`levels.${path.level}`) : t('learningPathPickerModal.noLevel') }} ·
                {{ instrumentsLabel(path.instrument_ids) }}
              </span>
              <span class="text-xs text-ink-subtle">
                {{ t('learningPathPickerModal.updated', { date: formatDate(path.updated_at, locale) }) }}
              </span>
            </div>
          </button>
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
  </ModalOverlay>
</template>
