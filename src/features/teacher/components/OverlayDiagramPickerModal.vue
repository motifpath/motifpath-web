<script setup lang="ts">
/**
 * Picks a diagram to overlay on the one being authored: any diagram the caller
 * can see on the same instrument, apart from the one being edited and those
 * already overlaid. Mount it only while it's shown, so each opening fetches a
 * fresh list. Only picks; the caller adds the overlay.
 */
import { computed, useId } from 'vue'

import { useListDiagrams } from '@/features/teacher/composables/useListDiagrams'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

const props = defineProps<{
  instrumentId: string
  /** Diagrams not to offer: the one being edited and those already overlaid. */
  excludeIds: string[]
}>()
const emit = defineEmits<{ select: [diagram: Diagram]; close: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const titleId = useId()

const { diagrams, total, hasMore, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore } = useListDiagrams(
  () => ({ instrumentId: props.instrumentId }),
)
const offered = computed(() => diagrams.value.filter((d) => !props.excludeIds.includes(d.diagram_id)))
</script>

<template>
  <ModalOverlay
    :open="true"
    panel-class="flex max-h-[80vh] w-[480px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-surface-raised shadow-level2"
    @close="emit('close')"
  >
    <div role="dialog" aria-modal="true" :aria-labelledby="titleId" class="flex min-h-0 flex-col">
      <div class="flex items-center justify-between border-b border-border px-5 py-[18px]">
        <h2 :id="titleId" class="text-base font-bold text-ink">{{ t('overlayDiagramPickerModal.title') }}</h2>
        <ModalCloseButton @close="emit('close')" />
      </div>

      <div class="flex min-h-0 flex-col gap-3 overflow-y-auto p-5">
        <p class="text-sm text-ink-muted">{{ t('overlayDiagramPickerModal.hint') }}</p>

        <StateLoading
          v-if="isLoading"
          data-test="overlay-picker-loading"
          :noun="t('overlayDiagramPickerModal.loadingNoun')"
        />

        <StateError
          v-else-if="error"
          data-test="overlay-picker-error"
          :message="t('overlayDiagramPickerModal.loadErrorMessage')"
          @retry="reload"
        />

        <StateEmpty
          v-else-if="offered.length === 0 && !hasMore"
          data-test="overlay-picker-empty"
          :heading="t('overlayDiagramPickerModal.emptyHeading')"
          :message="t('overlayDiagramPickerModal.emptyMessage')"
        />

        <template v-else>
          <ul class="flex flex-col gap-2">
            <li v-for="diagram in offered" :key="diagram.diagram_id">
              <button
                type="button"
                data-test="overlay-option"
                class="flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-left"
                @click="emit('select', diagram)"
              >
                <span data-test="overlay-option-name" class="font-semibold text-ink">{{
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
    </div>
  </ModalOverlay>
</template>
