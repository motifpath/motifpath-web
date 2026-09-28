<script setup lang="ts">
/**
 * Lists the diagrams the caller can see — on one instrument when given, less
 * any it excludes — for the caller to pick one. Mount it only while it's
 * shown, so each showing fetches a fresh list. Only picks; the caller decides
 * what the pick does.
 */
import { computed } from 'vue'

import { useListDiagrams } from '@/features/teacher/composables/useListDiagrams'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
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

const { diagrams, total, hasMore, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore } = useListDiagrams(
  () => ({ instrumentId: props.instrumentId }),
)
const offered = computed(() => diagrams.value.filter((d) => !props.excludeIds.includes(d.diagram_id)))
</script>

<template>
  <div class="flex flex-col gap-3">
    <StateLoading
      v-if="isLoading"
      data-test="diagram-picker-loading"
      :noun="t('diagramPickerList.loadingNoun')"
    />

    <StateError
      v-else-if="error"
      data-test="diagram-picker-error"
      :message="t('diagramPickerList.loadErrorMessage')"
      @retry="reload"
    />

    <StateEmpty
      v-else-if="offered.length === 0 && !hasMore"
      data-test="diagram-picker-empty"
      :heading="emptyHeading ?? t('diagramPickerList.emptyHeading')"
      :message="emptyMessage ?? t('diagramPickerList.emptyMessage')"
    />

    <template v-else>
      <ul class="flex flex-col gap-2">
        <li v-for="diagram in offered" :key="diagram.diagram_id">
          <button
            type="button"
            data-test="diagram-option"
            class="flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-left"
            @click="emit('select', diagram)"
          >
            <span data-test="diagram-option-name" class="font-semibold text-ink">{{
              localizedName(diagram.names)
            }}</span>
            <span
              v-if="diagram.kind === 'basic'"
              data-test="template-badge"
              class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
              >{{ t('diagramListView.templateBadge') }}</span
            >
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
