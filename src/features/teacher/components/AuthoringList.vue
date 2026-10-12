<script setup lang="ts" generic="S extends AuthoringSection">
/**
 * One Teach section's list, the same pattern for every section: the title and New, status chips
 * where the section has a publish state, the search and the filters, the applied filters as
 * removable chips, the count with the sort, then the items, 20 at a time as the end comes into
 * view. On a phone or a tablet the filters open in a layer; on a computer they are a side panel
 * that applies at once. The search, filters and sort live in the address and are remembered per
 * section. Each view draws its own items through the `item` slot.
 */
import { Plus } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import AuthoringCountSort from '@/features/teacher/components/AuthoringCountSort.vue'
import AuthoringFilterFields from '@/features/teacher/components/AuthoringFilterFields.vue'
import AuthoringFiltersLayer from '@/features/teacher/components/AuthoringFiltersLayer.vue'
import { useAuthoringFilterLabels } from '@/features/teacher/composables/useAuthoringFilterLabels'
import { type AuthoringSectionItems, useAuthoringList } from '@/features/teacher/composables/useAuthoringList'
import { useAuthoringListState } from '@/features/teacher/composables/useAuthoringListState'
import { useListReturn } from '@/features/teacher/composables/useListReturn'
import {
  activeFilterCount,
  type AuthoringListFilters,
  type AuthoringSection,
  CREATORS_SCOPE,
  sectionFilters,
  sectionStatuses,
} from '@/features/teacher/utils/authoringListQuery'
import type { MessageKey } from '@/i18n'
import AppliedFilters from '@/shared/components/AppliedFilters.vue'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import FilterButton from '@/shared/components/FilterButton.vue'
import ListEndLoader from '@/shared/components/ListEndLoader.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SearchField from '@/shared/components/SearchField.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useCourseCreators } from '@/shared/composables/useCourseCreators'
import { useKnowledgeTrees } from '@/shared/composables/useKnowledgeTrees'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const props = withDefaults(
  defineProps<{
    section: S
    title: string
    newLabel: string
    newTo: RouteLocationRaw
    /** The route name of an item's editor (its `id` param names the item), to come back to the same place. */
    editorRoute: string
    emptyTitle: string
    emptyMessage: string
    loadFailedMessage: string
    /** Items as a grid of tiles (diagrams) instead of one column of rows. */
    grid?: boolean
  }>(),
  { grid: false },
)
defineSlots<{ item(props: { item: AuthoringSectionItems[S] }): unknown }>()

const { t } = useTypedT()
const { sizeClass } = useSizeClass()
const isExpanded = computed(() => sizeClass.value === 'expanded')
const labels = useAuthoringFilterLabels()

const listState = useAuthoringListState(props.section)
const { state, searchText } = listState
const list = useAuthoringList(props.section, state)

const currentUser = useCurrentUserStore()
const me = computed(() =>
  currentUser.profile ? { user_id: currentUser.profile.user_id, display_name: currentUser.profile.display_name } : null,
)

const { instruments: instrumentList } = useListInstruments()
const { localizedName } = useLocalizedName()
const instruments = computed(() =>
  instrumentList.value.map((instrument) => ({ id: instrument.instrument_id, name: localizedName(instrument.names) })),
)
const { skillNodes, conceptNodes } = useKnowledgeTrees()
const { creators } = useCourseCreators(CREATORS_SCOPE[props.section])

const statuses = computed(() => sectionStatuses(props.section))

const STATUS_LABELS: Record<string, MessageKey> = {
  draft: 'authoringList.status.draft',
  published: 'authoringList.status.published',
  retired: 'authoringList.status.retired',
  unpublished_changes: 'authoringList.status.unpublished_changes',
}

function statusLabel(status: string): string {
  const key = STATUS_LABELS[status]
  return key ? t(key) : status
}
const filterCount = computed(() => activeFilterCount(state))
const narrowed = computed(() => state.q !== '' || state.status !== null || filterCount.value > 0)

const authorName = computed(() => {
  const author = state.filters.author
  if (!author) return null
  if (author === me.value?.user_id) return t('authoringList.me')
  return creators.value.find((creator) => creator.user_id === author)?.display_name ?? null
})

function nodeName(nodes: { id: string; name: string }[], id: string): string {
  return nodes.find((node) => node.id === id)?.name ?? '…'
}

/** The applied filters as chips, in the section's filter order; ids name what × removes. */
const chips = computed(() => {
  const f = state.filters
  return sectionFilters(props.section).flatMap((key): { id: string; label: string }[] => {
    switch (key) {
      case 'skills':
        return f.skills.map((id) => ({ id: `skills:${id}`, label: nodeName(skillNodes.value, id) }))
      case 'concepts':
        return f.concepts.map((id) => ({ id: `concepts:${id}`, label: nodeName(conceptNodes.value, id) }))
      case 'type':
        return f.type ? [{ id: key, label: labels.typeLabel(f.type) }] : []
      case 'level':
        return f.level ? [{ id: key, label: labels.levelLabel(f.level) }] : []
      case 'instrument':
        return f.instrument ? [{ id: key, label: nodeName(instruments.value, f.instrument) }] : []
      case 'kind':
        return f.kind ? [{ id: key, label: labels.kindLabel(f.kind) }] : []
      case 'shows':
        return f.shows ? [{ id: key, label: labels.showsLabel(f.shows) }] : []
      case 'root':
        return f.root ? [{ id: key, label: labels.rootLabel(f.root) }] : []
      case 'language':
        return f.language ? [{ id: key, label: labels.languageLabel(f.language) }] : []
      case 'author':
        return f.author ? [{ id: key, label: authorName.value ?? '…' }] : []
    }
  })
})

function removeChip(id: string) {
  const [key, value] = id.split(':')
  const filterKey = sectionFilters(props.section).find((offered) => offered === key)
  if (filterKey) listState.removeFilter(filterKey, value)
}

function clearNarrowing() {
  if (filterCount.value > 0) listState.clearFilters()
  else searchText.value = ''
}

const filtersOpen = ref(false)

function countFor(filters: AuthoringListFilters) {
  return list.countFor({ ...state, filters })
}

const items = list.items

useListReturn({
  section: props.section,
  editorRoute: props.editorRoute,
  idParam: 'id',
  list: { ...list, itemCount: computed(() => items.value.length) },
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="flex-1 text-xl font-bold text-ink sm:text-2xl">{{ title }}</h1>
      <SearchField v-if="isExpanded" v-model="searchText" class="w-72" :placeholder="t(`authoringList.searchPlaceholder.${section}`)" />
      <RouterLink
        :to="newTo"
        data-test="authoring-new"
        class="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg"
      >
        <Plus :size="18" aria-hidden="true" />
        {{ newLabel }}
      </RouterLink>
    </div>

    <div v-if="statuses.length" data-test="status-chips" class="flex flex-wrap gap-x-2" role="group" :aria-label="t('authoringList.statusLabel')">
      <ChoiceChip :label="t('authoringList.status.all')" :selected="state.status === null" @toggle="listState.setStatus(null)" />
      <ChoiceChip
        v-for="status in statuses"
        :key="status"
        :label="statusLabel(status)"
        :selected="state.status === status"
        @toggle="listState.setStatus(status)"
      />
    </div>

    <div v-if="!isExpanded" class="flex items-center gap-2">
      <SearchField v-model="searchText" class="flex-1" :placeholder="t(`authoringList.searchPlaceholder.${section}`)" />
      <div data-test="authoring-filters-button">
        <FilterButton :count="filterCount" @click="filtersOpen = true" />
      </div>
    </div>

    <div class="flex gap-6">
      <aside
        v-if="isExpanded"
        data-test="authoring-filters-panel"
        class="sticky top-4 flex max-h-[calc(100vh-2rem)] w-[280px] shrink-0 flex-col gap-3 self-start overflow-y-auto rounded-2xl border border-border bg-surface-raised p-4"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-ink">{{ t('authoringFilters.title') }}</h2>
          <button
            v-if="filterCount > 0"
            type="button"
            class="text-sm font-semibold text-accent-text hover:underline"
            @click="listState.clearFilters()"
          >
            {{ t('authoringFilters.clearAll') }}
          </button>
        </div>
        <AuthoringFilterFields
          :model-value="state.filters"
          :section="section"
          layout="panel"
          :instruments="instruments"
          :skill-nodes="skillNodes"
          :concept-nodes="conceptNodes"
          :me="me"
          :author-name="authorName"
          @update:model-value="listState.setFilters"
        />
      </aside>

      <div class="flex min-w-0 max-w-[880px] flex-1 flex-col gap-3">
        <AppliedFilters :chips="chips" @remove="removeChip" @clear="listState.clearFilters()" />
        <AuthoringCountSort
          v-if="!list.error.value"
          :section="section"
          :shown="list.total.value"
          :section-total="list.sectionTotal.value"
          :narrowed="narrowed"
          :sort="state.sort"
          @update:sort="listState.setSort"
        />

        <LoadingSkeleton v-if="list.isLoading.value && items.length === 0" data-test="authoring-loading" />
        <div v-else-if="list.error.value" data-test="authoring-load-failed">
          <LoadFailed :message="loadFailedMessage" @retry="list.reload()" />
        </div>
        <StateBlock
          v-else-if="items.length === 0 && !narrowed"
          data-test="authoring-empty"
          kind="empty"
          :title="emptyTitle"
          :message="emptyMessage"
        >
          <template #action>
            <RouterLink :to="newTo" class="text-sm font-semibold text-accent-text underline">{{ newLabel }}</RouterLink>
          </template>
        </StateBlock>
        <StateBlock
          v-else-if="items.length === 0"
          data-test="authoring-no-matches"
          kind="empty"
          :title="t('authoringList.noMatchesTitle')"
          :message="t('authoringList.noMatchesMessage')"
        >
          <template #action>
            <button
              type="button"
              data-test="authoring-clear-filters"
              class="text-sm font-semibold text-accent-text underline"
              @click="clearNarrowing"
            >
              {{ t('authoringList.clearFilters') }}
            </button>
          </template>
        </StateBlock>
        <template v-else>
          <ul :class="grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-2'">
            <li v-for="(item, index) in items" :key="index">
              <slot name="item" :item="item" />
            </li>
          </ul>
          <ListEndLoader
            :has-more="list.hasMore.value"
            :loading="list.isLoadingMore.value"
            :failed="list.loadMoreError.value"
            @load="list.loadMore()"
          />
        </template>
      </div>
    </div>

    <AuthoringFiltersLayer
      v-if="!isExpanded"
      :open="filtersOpen"
      :section="section"
      :filters="state.filters"
      :count="countFor"
      :instruments="instruments"
      :skill-nodes="skillNodes"
      :concept-nodes="conceptNodes"
      :me="me"
      :author-name="authorName"
      @apply="listState.setFilters"
      @close="filtersOpen = false"
    />
  </div>
</template>
