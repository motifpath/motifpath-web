<script setup lang="ts">
/**
 * Where diagrams are overlaid on the one being authored: the teacher picks one
 * or more diagrams, sees the full-size preview of what merging them would
 * produce, then either discards them (the editor stays as it was) or merges
 * them in as ordinary, editable positions and regions. Holds no overlay state
 * of its own; the caller keeps the overlays and builds the preview.
 */
import { ref, useId, watch } from 'vue'
import { Plus, X } from 'lucide-vue-next'

import OverlayDiagramPicker from '@/features/teacher/components/OverlayDiagramPicker.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']

const props = withDefaults(
  defineProps<{
    instrument: Instrument
    /** Diagrams not to offer: the one being edited and those already overlaid. */
    excludeIds: string[]
    overlays: Diagram[]
    /** The diagram merging would produce; null while nothing is overlaid. */
    preview: Diagram | null
    regionPerLayer: boolean
    canMerge: boolean
    labelMode?: 'interval' | 'note' | 'hidden'
  }>(),
  { labelMode: 'interval' },
)
const emit = defineEmits<{
  add: [diagram: Diagram]
  remove: [diagramId: string]
  'update:regionPerLayer': [value: boolean]
  merge: []
  discard: []
}>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const titleId = useId()
const previewRef: DiagramRef = { diagram_id: '', layers: { intervals: true } }

// The list of diagrams to pick from shows until something is overlaid, and again on request.
const picking = ref(props.overlays.length === 0)
watch(
  () => props.overlays.length,
  (count) => {
    if (count === 0) picking.value = true
  },
)

function onPicked(diagram: Diagram) {
  emit('add', diagram)
  picking.value = false
}

function checked(event: Event): boolean {
  return event.target instanceof HTMLInputElement && event.target.checked
}
</script>

<template>
  <ModalOverlay
    :open="true"
    panel-class="flex max-h-[90vh] w-[960px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-surface-raised shadow-level2"
    @close="emit('discard')"
  >
    <div role="dialog" aria-modal="true" :aria-labelledby="titleId" class="flex min-h-0 flex-col">
      <div class="flex items-center justify-between border-b border-border px-5 py-[18px]">
        <h2 :id="titleId" class="text-base font-bold text-ink">{{ t('overlayDiagramsModal.title') }}</h2>
        <ModalCloseButton @close="emit('discard')" />
      </div>

      <div class="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
        <p class="text-sm text-ink-muted">{{ t('overlayDiagramsModal.hint') }}</p>

        <template v-if="picking">
          <OverlayDiagramPicker :instrument-id="instrument.instrument_id" :exclude-ids="excludeIds" @select="onPicked" />
          <button
            v-if="overlays.length > 0"
            type="button"
            data-test="back-to-preview"
            class="w-fit text-sm font-semibold text-accent-text underline"
            @click="picking = false"
          >
            {{ t('overlayDiagramsModal.backToPreview') }}
          </button>
        </template>

        <template v-else>
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-for="overlay in overlays"
              :key="overlay.diagram_id"
              data-test="overlay-item"
              class="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-sm text-ink"
            >
              <span
                class="h-3 w-3 rounded-full"
                :class="overlay.color ? '' : 'bg-accent'"
                :style="overlay.color ? { backgroundColor: overlay.color } : undefined"
                aria-hidden="true"
              />{{ localizedName(overlay.names) }}<button
                type="button"
                data-test="remove-overlay"
                :aria-label="t('overlayDiagramsModal.removeOverlayAriaLabel', { name: localizedName(overlay.names) })"
                class="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle"
                @click="emit('remove', overlay.diagram_id)"
              >
                <X :size="13" aria-hidden="true" />
              </button>
            </span>
            <button
              type="button"
              data-test="add-another-overlay"
              class="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-sm font-semibold text-ink-muted"
              @click="picking = true"
            >
              <Plus :size="13" aria-hidden="true" />
              {{ t('overlayDiagramsModal.addAnother') }}
            </button>
          </div>

          <FrettedDiagramView
            v-if="preview"
            :diagram="preview"
            :instrument="instrument"
            :diagram-ref="previewRef"
            :label-mode="labelMode"
          />

          <label class="flex items-start gap-2.5 text-sm text-ink">
            <input
              :checked="regionPerLayer"
              type="checkbox"
              data-test="merge-region-per-layer"
              class="mt-0.5"
              @change="emit('update:regionPerLayer', checked($event))"
            />
            <span>{{ t('overlayDiagramsModal.regionPerLayer') }}</span>
          </label>
          <p v-if="!canMerge" data-test="merge-needs-root" class="text-sm text-ink-subtle">
            {{ t('overlayDiagramsModal.mergeNeedsRoot') }}
          </p>
        </template>
      </div>

      <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button
          type="button"
          data-test="discard-overlays"
          class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink"
          @click="emit('discard')"
        >
          {{ t('overlayDiagramsModal.discard') }}
        </button>
        <button
          type="button"
          data-test="merge-overlays"
          :disabled="!canMerge"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('merge')"
        >
          {{ t('overlayDiagramsModal.merge') }}
        </button>
      </div>
    </div>
  </ModalOverlay>
</template>
