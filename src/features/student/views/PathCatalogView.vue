<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useCatalogReturn } from '@/features/student/composables/useCatalogReturn'
import { useEnrollInLearningPath } from '@/features/student/composables/useEnrollInLearningPath'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { usePathCatalog } from '@/features/student/composables/usePathCatalog'
import CourseCard from '@/shared/components/CourseCard.vue'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

type PathCatalogEntry = components['schemas']['PathCatalogEntry']

const { t } = useTypedT()
const toast = useToast()
const router = useRouter()
const { instrumentsLabel } = useInstrumentNames()

const catalogReturn = useCatalogReturn({
  kind: 'paths',
  detailRoute: 'path-detail',
  idParam: 'learningPathId',
  returnQuery: 'returnFromPath',
})

const {
  paths,
  total,
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
} = usePathCatalog(catalogReturn.initialState)
const held = useMyStandalonePaths()
const { enrollInLearningPath } = useEnrollInLearningPath()

catalogReturn.resume({
  itemCount: computed(() => paths.value.length),
  total,
  isLoading,
  isLoadingMore,
  error,
  loadMoreError,
  loadMore,
  filters,
  searchText,
})

// Paths the learner already holds an active standalone copy of: enrolling
// again just reopens that copy, so the card offers to continue instead.
const heldPathIds = computed(
  () => new Set(held.paths.value.filter((p) => !p.archived_at).map((p) => p.source_template_id)),
)

function filterByTeacher(path: PathCatalogEntry) {
  filters.teacher = path.created_by
}

const enrollingPathId = ref<string | null>(null)

// Enrolling always makes the path the learner's current one, so they land on it.
async function enroll(path: PathCatalogEntry) {
  const alreadyHeld = heldPathIds.value.has(path.learning_path_id)
  enrollingPathId.value = path.learning_path_id
  try {
    await enrollInLearningPath(path.learning_path_id)
    if (!alreadyHeld) toast.success(t('pathCatalogView.enrolledToast', { title: path.title }))
    await router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    enrollingPathId.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <h1 class="text-xl font-semibold text-accent-text sm:text-2xl">{{ t('pathCatalogView.heading') }}</h1>

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
      compact
      teacher-scope="path-catalog"
      :search-placeholder="t('pathCatalogView.searchPlaceholder')"
      :has-active-filters="hasActiveFilters"
      @clear="clearFilters"
    />

    <StateLoading v-if="isLoading" data-test="loading" :noun="t('pathCatalogView.loadingNoun')" />

    <StateError v-else-if="error" data-test="error" :message="t('pathCatalogView.errorMessage')" @retry="retry" />

    <StateEmpty
      v-else-if="paths.length === 0 && hasActiveFilters"
      data-test="no-matches"
      :heading="t('pathCatalogView.noMatchesHeading')"
      :message="t('pathCatalogView.noMatchesMessage')"
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
      :heading="t('pathCatalogView.emptyHeading')"
      :message="t('pathCatalogView.emptyMessage')"
    />

    <template v-else>
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="path in paths" :key="path.learning_path_id">
          <CourseCard
            kind="path"
            :title="path.title"
            :summary="path.summary"
            :created-by="path.created_by"
            :level="path.level"
            :language="path.language"
            :lesson-count="path.lesson_count"
            :thumbnail-url="path.thumbnail_url"
            :to="{ name: 'path-detail', params: { learningPathId: path.learning_path_id }, query: { fromCatalog: 'true' } }"
          >
            <template #badges>
              <span data-test="path-instruments" class="rounded-full bg-surface-sunken px-2.5 py-0.5">
                {{ instrumentsLabel(path.instrument_ids) }}
              </span>
            </template>
            <template #actions>
              <button
                type="button"
                data-test="more-from-teacher"
                class="text-sm font-semibold text-accent-text underline"
                @click="filterByTeacher(path)"
              >
                {{ t('pathCatalogView.moreFromTeacher') }}
              </button>
              <RouterLink
                :to="{
                  name: 'path-detail',
                  params: { learningPathId: path.learning_path_id },
                  query: { fromCatalog: 'true' },
                }"
                data-test="details"
                class="text-sm font-semibold text-accent-text underline"
              >
                {{ t('pathCatalogView.details') }}
              </RouterLink>
              <PrimaryButton
                data-test="enroll"
                :disabled="enrollingPathId === path.learning_path_id"
                @click="enroll(path)"
              >
                {{
                  enrollingPathId === path.learning_path_id
                    ? t('pathCatalogView.enrolling')
                    : heldPathIds.has(path.learning_path_id)
                      ? t('pathCatalogView.continue')
                      : t('pathCatalogView.enroll')
                }}
              </PrimaryButton>
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
  </section>
</template>
