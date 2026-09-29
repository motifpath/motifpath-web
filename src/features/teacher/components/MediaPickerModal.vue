<script setup lang="ts">
/**
 * One modal to choose what an exercise shows: an uploaded image, or a
 * prebuilt diagram. An image is taken as soon as it's picked. A diagram is
 * configured in the diagram picker and taken once applied — or, with
 * `chooseOnly` (a stimulus, whose labels, hidden and correct positions are
 * set in the exercise form), taken as soon as it's picked, drawn as its
 * author made it with no answer yet. An option's diagram is drawn as a still
 * picture, so it's configured without playback settings. Rendered at the document body, and a
 * fixed-height panel so switching tabs or filtering never resizes it.
 */
import { ref, watch } from 'vue'

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
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
watch(
  () => props.open,
  (open) => {
    if (!open) return
    tab.value = props.initialDiagram ? 'diagram' : 'image'
    chosen.value = null
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
  <Teleport to="body">
    <ModalOverlay
      :open="open"
      panel-class="flex h-[85vh] w-[720px] max-w-[92vw] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
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

        <div class="min-h-0 flex-1 overflow-y-auto">
          <FileDropField v-if="tab === 'image'" @select="emit('image', $event)" />
          <DiagramPickerList v-else-if="chooseOnly" @select="pick" />
          <DiagramEmbedPicker v-else :initial="initialDiagram" :playable="false" @change="chosen = $event" />
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
            v-if="tab === 'diagram' && !chooseOnly"
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
  </Teleport>
</template>
