<script setup lang="ts">
/**
 * The options of an audio_selection exercise: each one's sound (an uploaded file or a diagram's
 * playback, mixed freely), the label students see beside it, and whether it is right. A picked
 * file previews locally and uploads on save; a diagram sound is chosen and set in the sound picker.
 */
import { Music } from 'lucide-vue-next'
import { ref } from 'vue'

import OptionsEditorGrid from '@/features/teacher/components/OptionsEditorGrid.vue'
import SoundPickerModal from '@/features/teacher/components/SoundPickerModal.vue'
import SoundSource from '@/features/teacher/components/SoundSource.vue'
import type { SoundValue } from '@/features/teacher/components/SoundSource.vue'
import { useOptionMediaPicker } from '@/features/teacher/composables/useOptionMediaPicker'
import type { AudioOption } from '@/features/teacher/composables/useExerciseForm'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(defineProps<{ options: AudioOption[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{
  /** A local preview URL to show immediately — not yet uploaded. */
  setPreview: [id: string, previewUrl: string]
  /** The raw file, uploaded only when the exercise is saved. */
  setFile: [id: string, file: File]
  /** A diagram's playback as the option's sound, replacing any file. */
  setDiagram: [id: string, sound: DiagramRef]
  /** The option keeps no sound. */
  clearSound: [id: string]
  editLabel: [id: string, label: string]
  toggle: [id: string]
  remove: [id: string]
  add: []
}>()

const { t } = useTypedT()

const { pickerTargetId, onPicked } = useOptionMediaPicker(
  () => props.options,
  (o) => o.audioUrl,
  (id, url) => emit('setPreview', id, url),
  (id, file) => emit('setFile', id, file),
)

function soundOf(option: AudioOption): SoundValue | null {
  if (option.diagramRef) return { kind: 'diagram', ref: option.diagramRef }
  return option.audioUrl ? { kind: 'file', url: option.audioUrl } : null
}

function onFile(id: string, file: File) {
  pickerTargetId.value = id
  onPicked(file)
}

/** The option whose diagram sound the picker is choosing or editing. */
const soundTarget = ref<{ id: string; initial: DiagramRef | null } | null>(null)

function onSoundPicked(sound: DiagramRef) {
  if (soundTarget.value) emit('setDiagram', soundTarget.value.id, sound)
  soundTarget.value = null
}
</script>

<template>
  <OptionsEditorGrid
    :options="options"
    :compact="compact"
    wide
    :add-icon="Music"
    :add-label="t('audioSelectionOptionsEditor.addLabel')"
    @toggle="emit('toggle', $event)"
    @remove="emit('remove', $event)"
    @add="emit('add')"
  >
    <!-- The label leaves room at its end for the card's remove button. -->
    <template #media="{ option }">
      <input
        type="text"
        data-test="option-label"
        :aria-label="t('audioSelectionOptionsEditor.labelAriaLabel')"
        :placeholder="t('audioSelectionOptionsEditor.labelPlaceholder')"
        :value="option.label"
        class="h-11 w-full rounded-md border border-border bg-surface-raised pl-3 pr-9 text-sm font-semibold"
        @input="emit('editLabel', option.id, ($event.target as HTMLInputElement).value)"
      />
    </template>
    <template #extra="{ option }">
      <SoundSource
        :sound="soundOf(option)"
        :title="option.label || t('audioSelectionOptionsEditor.labelPlaceholder')"
        @file="onFile(option.id, $event)"
        @diagram="soundTarget = { id: option.id, initial: null }"
        @edit="soundTarget = { id: option.id, initial: option.diagramRef ?? null }"
        @remove="emit('clearSound', option.id)"
      />
    </template>

    <template #modal>
      <SoundPickerModal
        :open="soundTarget !== null"
        :initial="soundTarget?.initial ?? null"
        @apply="onSoundPicked"
        @close="soundTarget = null"
      />
    </template>
  </OptionsEditorGrid>
</template>
