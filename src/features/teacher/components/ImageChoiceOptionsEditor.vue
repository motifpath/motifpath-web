<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import MediaPickerModal from '@/features/teacher/components/MediaPickerModal.vue'
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

// The option whose image or diagram is being picked, or null while the picker is closed.
const pickerTarget = computed(() => props.options.find((o) => o.id === pickerTargetId.value) ?? null)

function onDiagramApplied(diagramRef: DiagramRef) {
  if (pickerTargetId.value) emit('setDiagram', pickerTargetId.value, diagramRef)
  pickerTargetId.value = null
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

        <button
          type="button"
          data-test="choose-media"
          :aria-label="
            option.imageUrl || option.diagramRef
              ? t('imageChoiceOptionsEditor.changeMediaAriaLabel')
              : t('imageChoiceOptionsEditor.chooseMediaAriaLabel')
          "
          class="absolute inset-0 flex items-center justify-center"
          @click="openPicker(option.id)"
        >
          <span v-if="!option.imageUrl && !option.diagramRef" class="flex flex-col items-center gap-1 text-ink-muted">
            <ImagePlus :size="16" aria-hidden="true" />
            <span class="text-[0.6875rem]">{{ t('imageChoiceOptionsEditor.chooseMedia') }}</span>
          </span>
          <span
            v-else
            class="absolute bottom-1 left-1 flex h-[22px] w-[22px] items-center justify-center rounded bg-surface-raised text-ink-subtle"
          >
            <ImagePlus :size="12" aria-hidden="true" />
          </span>
        </button>
      </div>
    </template>

    <template #modal>
      <MediaPickerModal
        :open="pickerTargetId !== null"
        :initial-diagram="pickerTarget?.diagramRef ?? null"
        @image="onPicked"
        @diagram="onDiagramApplied"
        @close="pickerTargetId = null"
      />
    </template>
  </OptionsEditorGrid>
</template>
