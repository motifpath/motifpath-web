<script setup lang="ts">
/**
 * Discover: the course and path catalogs behind one Courses | Paths control, with one search and
 * one set of filters shared by both. Everything lives in the address, so Back from a detail and a
 * shared link reopen the same list. Rows open the detail; nothing starts from here.
 */
import { computed, ref } from 'vue'

import CatalogCard from '@/features/student/components/CatalogCard.vue'
import DiscoverFiltersLayer from '@/features/student/components/DiscoverFiltersLayer.vue'
import { useCatalogReturn } from '@/features/student/composables/useCatalogReturn'
import { useDiscoverCatalog } from '@/features/student/composables/useDiscoverCatalog'
import { useDiscoverChips } from '@/features/student/composables/useDiscoverChips'
import { type DiscoverSegment, useDiscoverState } from '@/features/student/composables/useDiscoverState'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { type CatalogItem, catalogBadge } from '@/features/student/utils/catalogItem'
import { activeFilterCount, type DiscoverFilters } from '@/features/student/utils/discoverQuery'
import AppButton from '@/shared/components/AppButton.vue'
import AppliedFilters from '@/shared/components/AppliedFilters.vue'
import FilterButton from '@/shared/components/FilterButton.vue'
import ListEndLoader from '@/shared/components/ListEndLoader.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SearchField from '@/shared/components/SearchField.vue'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t, locale } = useTypedT()
const { sizeClass } = useSizeClass()

const discover = useDiscoverState()
const { state, searchText, segment } = discover
// Read before the first render tidies the address of the detail's return marker.
const catalogReturn = useCatalogReturn(segment)
const catalog = useDiscoverCatalog(segment, state)
catalogReturn.resume({
  itemCount: computed(() => catalog.items.value.length),
  total: catalog.total,
  isLoading: catalog.isLoading,
  isLoadingMore: catalog.isLoadingMore,
  error: catalog.error,
  loadMoreError: catalog.loadMoreError,
  loadMore: catalog.loadMore,
})
const chips = useDiscoverChips(state)
const { enrollments } = useMyCourseEnrollments()
const { paths: heldPaths } = useMyStandalonePaths()
const { instruments: allInstruments } = useListInstruments()
const { localizedName } = useLocalizedName()

const filtersOpen = ref(false)
const instruments = computed(() =>
  allInstruments.value.map((instrument) => ({ id: instrument.instrument_id, name: localizedName(instrument.names) })),
)
const teacherName = computed(() => {
  const label = chips.value.find((chip) => chip.id === 'teacher')?.label
  return label && label !== '…' ? label : null
})

const otherSegment = computed<DiscoverSegment>(() => (segment.value === 'courses' ? 'paths' : 'courses'))
const layout = computed(() => (sizeClass.value === 'expanded' ? 'tile' : 'row'))

const segmentModel = computed<string>({
  get: () => segment.value,
  set: (value) => {
    if (value === 'courses' || value === 'paths') discover.setSegment(value)
  },
})
const segmentOptions = computed(() => [
  { value: 'courses', label: t('discoverView.courses') },
  { value: 'paths', label: t('discoverView.paths') },
])

const countLine = computed(() =>
  t(`discoverView.count.${segment.value}`, {
    count: catalog.total.value,
    shown: new Intl.NumberFormat(locale.value).format(catalog.total.value),
  }),
)

const narrowed = computed(() => state.q !== '' || activeFilterCount(state.filters) > 0)

const nothingFor = computed(() => {
  const filters = chips.value.map((chip) => chip.label).join(', ')
  if (state.q && filters) return t('discoverView.nothingFor.searchAndFilters', { q: state.q, filters })
  if (state.q) return t('discoverView.nothingFor.search', { q: state.q })
  return t('discoverView.nothingFor.filters', { filters })
})

function badge(item: CatalogItem) {
  return catalogBadge(item, { enrollments: enrollments.value, paths: heldPaths.value })
}

function detailRoute(item: CatalogItem) {
  return item.kind === 'course'
    ? { name: 'course-detail', params: { courseId: item.id } }
    : { name: 'path-detail', params: { learningPathId: item.id } }
}

const CHIP_KEYS: (keyof DiscoverFilters)[] = ['levels', 'instrument', 'language', 'teacher', 'skills', 'concepts']

// A chip's id names its filter, and for a level, skill or concept also which one.
function removeChip(id: string) {
  const [key, value] = id.split(':')
  const filterKey = CHIP_KEYS.find((candidate) => candidate === key)
  if (filterKey) discover.removeFilter(filterKey, value)
}
</script>

<template>
  <section class="flex w-full flex-col gap-4" :class="{ 'max-w-[35rem]': layout === 'row' }">
    <h1 class="text-xl font-semibold text-ink sm:text-2xl">{{ t('nav.discover') }}</h1>
    <SegmentedControl
      v-model="segmentModel"
      :label="t('discoverView.segments')"
      :options="segmentOptions"
      test-id-prefix="discover"
      :class="{ 'max-w-xs': layout === 'tile' }"
    />

    <div class="flex items-center gap-2" :class="{ 'max-w-xl': layout === 'tile' }">
      <SearchField v-model="searchText" class="flex-1" :placeholder="t(`discoverView.search.${segment}`)" />
      <FilterButton data-test="discover-filters" :count="activeFilterCount(state.filters)" @click="filtersOpen = true" />
    </div>

    <AppliedFilters :chips="chips" @remove="removeChip" @clear="discover.clearFilters()" />

    <LoadingSkeleton v-if="catalog.isLoading.value && catalog.items.value.length === 0" data-test="discover-loading" />

    <LoadFailed v-else-if="catalog.error.value" :message="t('discoverView.loadFailed')" @retry="catalog.reload()" />

    <StateBlock
      v-else-if="catalog.items.value.length === 0 && narrowed"
      data-test="discover-no-matches"
      kind="notFound"
      :title="t(`discoverView.noMatches.${segment}`)"
      :message="nothingFor"
    >
      <template #action>
        <AppButton
          v-if="activeFilterCount(state.filters) > 0"
          data-test="discover-clear-filters"
          block
          @click="discover.clearFilters()"
        >
          {{ t('discoverView.clearFilters') }}
        </AppButton>
        <p v-if="catalog.otherCount.value" data-test="discover-other-matches" class="mt-3 text-sm text-ink-muted">
          {{ t(`discoverView.otherMatches.${otherSegment}`, { count: catalog.otherCount.value }) }}
          ·
          <button
            type="button"
            data-test="discover-show-other"
            class="font-semibold text-accent-text hover:underline"
            @click="discover.setSegment(otherSegment)"
          >
            {{ t(`discoverView.showOther.${otherSegment}`) }}
          </button>
        </p>
      </template>
    </StateBlock>

    <StateBlock
      v-else-if="catalog.items.value.length === 0"
      data-test="discover-empty"
      kind="empty"
      :title="t(`discoverView.empty.${segment}`)"
      :message="t('discoverView.emptyMessage')"
    />

    <template v-else>
      <p data-test="discover-count" class="text-xs text-ink-muted">{{ countLine }}</p>
      <ul
        data-test="discover-items"
        :class="layout === 'tile' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-2'"
      >
        <li v-for="item in catalog.items.value" :key="item.id">
          <CatalogCard :item="item" :badge="badge(item)" :layout="layout" :to="detailRoute(item)" />
        </li>
      </ul>
      <ListEndLoader
        :has-more="catalog.hasMore.value"
        :loading="catalog.isLoadingMore.value"
        :failed="catalog.loadMoreError.value"
        @load="catalog.loadMore()"
      />
    </template>

    <DiscoverFiltersLayer
      :open="filtersOpen"
      :segment="segment"
      :filters="state.filters"
      :count="catalog.countMatches"
      :instruments="instruments"
      :teacher-name="teacherName"
      @apply="discover.setFilters"
      @close="filtersOpen = false"
    />
  </section>
</template>
