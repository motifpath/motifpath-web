<script setup lang="ts">
/**
 * One modal to choose what an exercise shows: an uploaded image, or a
 * prebuilt diagram configured in the diagram picker (with its correct
 * answers, for a stimulus). An image is taken as soon as it's picked; a
 * diagram once it's applied. Rendered at the document body, and a
 * fixed-height panel so switching tabs or filtering never resizes it.
 */
import { ref, watch } from 'vue'

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import FileDropField from '@/features/teacher/components/FileDropField.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    open: boolean
    /** The diagram already chosen, reopened on the diagram tab; null starts on the image tab. */
    initialDiagram: DiagramRef | null
    /** An exercise stimulus: the diagram tab also asks for the correct positions. */
    answers?: boolean
  }>(),
  { answers: false },
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
          <DiagramEmbedPicker v-else :initial="initialDiagram" :answers="answers" @change="chosen = $event" />
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
            v-if="tab === 'diagram'"
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
