<script setup lang="ts">
import { Guitar, ImagePlus } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import DiagramEmbedPickerModal from '@/features/teacher/components/DiagramEmbedPickerModal.vue'
import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import OptionsEditorGrid from '@/features/teacher/components/OptionsEditorGrid.vue'
import { useOptionMediaPicker } from '@/features/teacher/composables/useOptionMediaPicker'
import type { ImageOption } from '@/features/teacher/composables/useExerciseForm'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(defineProps<{ options: ImageOption[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{
  /** A local preview URL to show immediately — not yet uploaded. */
  setPreview: [id: string, previewUrl: string]
  /** The raw file, uploaded only when the exercise is saved. */
  setFile: [id: string, file: File]
  /** A prebuilt diagram shown as this option instead of an image. */
  setDiagram: [id: string, diagramRef: DiagramRef]
  toggle: [id: string]
  remove: [id: string]
  add: []
}>()

const { pickerTargetId, openPicker, onPicked } = useOptionMediaPicker(
  () => props.options,
  (o) => o.imageUrl,
  (id, url) => emit('setPreview', id, url),
  (id, file) => emit('setFile', id, file),
)

// The option whose diagram is being picked, or null while the picker is closed.
const diagramTargetId = ref<string | null>(null)
const diagramTarget = computed(() => props.options.find((o) => o.id === diagramTargetId.value) ?? null)

function onDiagramApplied(diagramRef: DiagramRef) {
  if (diagramTargetId.value) emit('setDiagram', diagramTargetId.value, diagramRef)
  diagramTargetId.value = null
}

const { t } = useTypedT()
</script>

<template>
  <OptionsEditorGrid
    :options="options"
    :compact="compact"
    :add-icon="ImagePlus"
    :add-label="t('imageChoiceOptionsEditor.addLabel')"
    @toggle="emit('toggle', $event)"
    @remove="emit('remove', $event)"
    @add="emit('add')"
  >
    <template #media="{ option }">
      <div class="relative min-h-[84px] overflow-hidden rounded-sm border border-border bg-surface-sunken">
        <EmbeddedDiagram v-if="option.diagramRef" :embed="{ kind: 'single', ref: option.diagramRef }" inert class="p-1" />
        <img
          v-else-if="option.imageUrl"
          :src="option.imageUrl"
          alt=""
          draggable="false"
          class="absolute inset-0 h-full w-full object-contain"
        />

        <div v-if="!option.imageUrl && !option.diagramRef" class="absolute inset-0 flex">
          <button
            type="button"
            data-test="choose-image"
            :aria-label="t('imageChoiceOptionsEditor.chooseImageAriaLabel')"
            class="flex flex-1 flex-col items-center justify-center gap-1 text-ink-muted"
            @click="openPicker(option.id)"
          >
            <ImagePlus :size="16" aria-hidden="true" />
            <span class="text-[0.6875rem]">{{ t('imageChoiceOptionsEditor.chooseImage') }}</span>
          </button>
          <button
            type="button"
            data-test="choose-diagram"
            :aria-label="t('imageChoiceOptionsEditor.chooseDiagramAriaLabel')"
            class="flex flex-1 flex-col items-center justify-center gap-1 border-l border-border text-ink-muted"
            @click="diagramTargetId = option.id"
          >
            <Guitar :size="16" aria-hidden="true" />
            <span class="text-[0.6875rem]">{{ t('imageChoiceOptionsEditor.chooseDiagram') }}</span>
          </button>
        </div>
        <template v-else>
          <button
            type="button"
            data-test="choose-image"
            :aria-label="t('imageChoiceOptionsEditor.changeImageAriaLabel')"
            class="absolute bottom-1 left-1 flex h-[22px] w-[22px] items-center justify-center rounded bg-surface-raised text-ink-subtle"
            @click="openPicker(option.id)"
          >
            <ImagePlus :size="12" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-test="choose-diagram"
            :aria-label="t('imageChoiceOptionsEditor.changeDiagramAriaLabel')"
            class="absolute bottom-1 right-1 flex h-[22px] w-[22px] items-center justify-center rounded bg-surface-raised text-ink-subtle"
            @click="diagramTargetId = option.id"
          >
            <Guitar :size="12" aria-hidden="true" />
          </button>
        </template>
      </div>
    </template>

    <template #modal>
      <ImagePickerModal :open="pickerTargetId !== null" @select="onPicked" @close="pickerTargetId = null" />
      <DiagramEmbedPickerModal
        :open="diagramTargetId !== null"
        :initial="diagramTarget?.diagramRef ?? null"
        :editing="!!diagramTarget?.diagramRef"
        @apply="onDiagramApplied"
        @close="diagramTargetId = null"
      />
    </template>
  </OptionsEditorGrid>
</template>
