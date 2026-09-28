<script setup lang="ts">
/**
 * Lists the diagrams the caller can see — on one instrument when given, less
 * any it excludes — for the caller to pick one, each drawn whole so its
 * colors, shapes and labels can be told apart. Searchable by name, root
 * note, kind and author. Mount it only while it's shown, so each showing
 * fetches a fresh list. Only picks; the caller decides what the pick does.
 */
import { Search } from 'lucide-vue-next'
import { computed } from 'vue'

import { useDiagramSearch } from '@/features/teacher/composables/useDiagramSearch'
import DiagramThumbnail from '@/shared/components/diagram/DiagramThumbnail.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import TeacherFilterPicker from '@/shared/components/TeacherFilterPicker.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

const props = withDefaults(
  defineProps<{
    instrumentId?: string
    /** Diagrams not to offer. */
    excludeIds?: string[]
    emptyHeading?: string
    emptyMessage?: string
  }>(),
  { instrumentId: undefined, excludeIds: () => [], emptyHeading: undefined, emptyMessage: undefined },
)
const emit = defineEmits<{ select: [diagram: Diagram] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { instruments } = useListInstruments()

const {
  diagrams, total, hasMore, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore,
  nameText, rootNote, kind, author, hasActiveFilters, clearFilters,
} = useDiagramSearch(() => props.instrumentId)
const offered = computed(() => diagrams.value.filter((d) => !props.excludeIds.includes(d.diagram_id)))

const KIND_CHIPS = [
  { value: null, test: 'diagram-kind-all', label: 'diagramPickerList.kindAll' },
  { value: 'basic', test: 'diagram-kind-basic', label: 'diagramPickerList.kindTemplates' },
  { value: 'custom', test: 'diagram-kind-custom', label: 'diagramPickerList.kindCustom' },
] as const
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-3">
      <div class="relative">
        <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
        <input
          v-model="nameText"
          data-test="diagram-search"
          type="search"
          :aria-label="t('diagramPickerList.searchLabel')"
          :placeholder="t('diagramPickerList.searchPlaceholder')"
          class="w-full rounded-md border border-border bg-surface py-2 pl-8 pr-3 text-sm"
        />
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label for="diagram-root-filter" class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('diagramPickerList.rootLabel') }}
          </label>
          <select
            id="diagram-root-filter"
            v-model="rootNote"
            data-test="diagram-root-filter"
            class="rounded-md border border-border bg-surface px-2 py-2 text-sm"
          >
            <option value="">{{ t('diagramPickerList.anyRoot') }}</option>
            <option v-for="note in CHROMATIC_SCALE" :key="note" :value="note">{{ note }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('diagramPickerList.kindLabel') }}</span>
          <div class="flex gap-1 rounded-md bg-surface p-[3px]" role="group" :aria-label="t('diagramPickerList.kindLabel')">
            <button
              v-for="chip in KIND_CHIPS"
              :key="chip.test"
              type="button"
              :data-test="chip.test"
              :aria-pressed="kind === chip.value"
              class="rounded-sm px-2.5 py-1 text-xs font-semibold"
              :class="kind === chip.value ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="kind = chip.value"
            >
              {{ t(chip.label) }}
            </button>
          </div>
        </div>
        <TeacherFilterPicker v-model="author" scope="diagrams" :label="t('diagramPickerList.authorLabel')" class="min-w-48 flex-1" />
      </div>
      <button
        v-if="hasActiveFilters"
        type="button"
        data-test="diagram-filters-clear"
        class="w-fit text-xs font-semibold text-accent-text"
        @click="clearFilters"
      >
        {{ t('diagramPickerList.clearFilters') }}
      </button>
    </div>

    <StateLoading
      v-if="isLoading && diagrams.length === 0"
      data-test="diagram-picker-loading"
      :noun="t('diagramPickerList.loadingNoun')"
    />

    <StateError
      v-else-if="error"
      data-test="diagram-picker-error"
      :message="t('diagramPickerList.loadErrorMessage')"
      @retry="reload"
    />

    <p
      v-else-if="!isLoading && offered.length === 0 && !hasMore && hasActiveFilters"
      data-test="diagram-picker-no-matches"
      class="py-6 text-center text-sm text-ink-muted"
    >
      {{ t('diagramPickerList.noMatches') }}
    </p>

    <StateEmpty
      v-else-if="!isLoading && offered.length === 0 && !hasMore"
      data-test="diagram-picker-empty"
      :heading="emptyHeading ?? t('diagramPickerList.emptyHeading')"
      :message="emptyMessage ?? t('diagramPickerList.emptyMessage')"
    />

    <template v-else>
      <!-- A filter change keeps the current results until the new ones arrive, dimmed, so nothing jumps. -->
      <ul
        data-test="diagram-picker-results"
        :aria-busy="isLoading"
        class="grid grid-cols-1 gap-2 transition-opacity sm:grid-cols-2"
        :class="{ 'opacity-50': isLoading }"
      >
        <li v-for="diagram in offered" :key="diagram.diagram_id">
          <button
            type="button"
            data-test="diagram-option"
            class="flex w-full flex-col gap-2 rounded-md border border-border bg-surface p-3 text-left hover:border-accent"
            @click="emit('select', diagram)"
          >
            <DiagramThumbnail :diagram="diagram" :instruments="instruments" />
            <span class="flex items-start justify-between gap-2">
              <span class="flex min-w-0 flex-col">
                <span data-test="diagram-option-name" class="truncate font-semibold text-ink">{{
                  localizedName(diagram.names)
                }}</span>
                <span data-test="diagram-option-author" class="truncate text-xs text-ink-subtle">{{
                  diagram.created_by.display_name
                }}</span>
              </span>
              <span
                v-if="diagram.kind === 'basic'"
                data-test="template-badge"
                class="shrink-0 rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
                >{{ t('diagramListView.templateBadge') }}</span
              >
            </span>
          </button>
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
</template>
