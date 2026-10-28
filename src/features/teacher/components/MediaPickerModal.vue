<script setup lang="ts">
/**
 * One modal to choose what an exercise shows: an uploaded image, or a
 * prebuilt diagram or chord. An image is taken as soon as it's picked. A
 * diagram is configured in the diagram picker and taken once applied, Apply
 * showing with its settings — or, with `chooseOnly` (a stimulus, whose
 * labels, hidden and correct positions are set in the exercise form), taken
 * as soon as it's picked, drawn as its author made it with no answer yet.
 * Rendered at the document body: a full-screen layer on a phone, else a
 * fixed-height dialog, so switching tabs or filtering never resizes it; the
 * picker scrolls its own results, keeping its search in place.
 */
import { ref, watch } from 'vue'

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import FileDropField from '@/features/teacher/components/FileDropField.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    open: boolean
    /** The diagram already chosen, reopened on the diagram tab; null starts on the image tab. */
    initialDiagram: DiagramRef | null
    /** The diagram tab only picks a diagram: how it shows is set elsewhere. */
    chooseOnly?: boolean
  }>(),
  { chooseOnly: false },
)
const emit = defineEmits<{
  image: [file: File]
  diagram: [diagramRef: DiagramRef]
  close: []
}>()

const { t } = useTypedT()

const tab = ref<'image' | 'diagram'>('image')
const chosen = ref<DiagramRef | null>(null)
const pickerStep = ref<'choose' | 'set'>('choose')
watch(
  () => props.open,
  (open) => {
    if (!open) return
    tab.value = props.initialDiagram ? 'diagram' : 'image'
    chosen.value = null
    pickerStep.value = 'choose'
  },
  { immediate: true },
)

function pick(diagram: Diagram) {
  emit('diagram', { diagram_id: diagram.diagram_id, layers: { label: 'custom', intervals: true }, correct_position_ids: [] })
}

function apply() {
  if (chosen.value) emit('diagram', chosen.value)
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="fixed inset-0 flex flex-col gap-4 bg-surface-raised px-4 pb-safe-4 pt-safe-top-4 sm:static sm:h-[85vh] sm:w-[1040px] sm:max-w-[92vw] sm:rounded-xl sm:p-5 sm:shadow-level2"
    @close="emit('close')"
  >
    <div data-test="media-picker" class="contents">
      <div class="flex items-center justify-between">
        <span class="text-base font-bold">{{ t('mediaPickerModal.title') }}</span>
        <ModalCloseButton @close="emit('close')" />
      </div>

      <div class="flex w-fit gap-1 rounded-md bg-surface-sunken p-[3px]" role="tablist">
        <button
          v-for="option in (['image', 'diagram'] as const)"
          :key="option"
          type="button"
          role="tab"
          :data-test="`media-tab-${option}`"
          :aria-selected="tab === option"
          class="rounded-sm px-3 py-1 text-xs font-semibold"
          :class="tab === option ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="tab = option"
        >
          {{ option === 'image' ? t('mediaPickerModal.image') : t('mediaPickerModal.diagram') }}
        </button>
      </div>

      <div data-test="media-picker-body" class="flex min-h-0 flex-1 flex-col">
        <FileDropField v-if="tab === 'image'" @select="emit('image', $event)" />
        <DiagramEmbedPicker
          v-else
          :initial="chooseOnly ? null : initialDiagram"
          :choose-only="chooseOnly"
          @change="chosen = $event"
          @step="pickerStep = $event"
          @pick="pick"
        />
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          data-test="media-cancel"
          class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
          @click="emit('close')"
        >
          {{ t('diagramEmbedPicker.cancel') }}
        </button>
        <button
          v-if="tab === 'diagram' && !chooseOnly && pickerStep === 'set'"
          type="button"
          data-test="media-apply"
          :disabled="!chosen"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
          @click="apply"
        >
          {{ t('diagramEmbedPicker.apply') }}
        </button>
      </div>
    </div>
  </ModalOverlay>
</template>
