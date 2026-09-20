<script setup lang="ts">
import { Music } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import OptionsEditorGrid from '@/features/teacher/components/OptionsEditorGrid.vue'
import { useOptionMediaPicker } from '@/features/teacher/composables/useOptionMediaPicker'
import type { AudioOption } from '@/features/teacher/composables/useExerciseForm'

const props = withDefaults(defineProps<{ options: AudioOption[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{
  /** A local preview URL to show immediately — not yet uploaded. */
  setPreview: [id: string, previewUrl: string]
  /** The raw file, uploaded only when the exercise is saved. */
  setFile: [id: string, file: File]
  editLabel: [id: string, label: string]
  toggle: [id: string]
  remove: [id: string]
  add: []
}>()

const { pickerTargetId, openPicker, onPicked } = useOptionMediaPicker(
  () => props.options,
  (o) => o.audioUrl,
  (id, url) => emit('setPreview', id, url),
  (id, file) => emit('setFile', id, file),
)

const { t } = useTypedT()
</script>

<template>
  <OptionsEditorGrid
    :options="options"
    :compact="compact"
    :add-icon="Music"
    :add-label="t('audioSelectionOptionsEditor.addLabel')"
    @toggle="emit('toggle', $event)"
    @remove="emit('remove', $event)"
    @add="emit('add')"
  >
    <template #media="{ option }">
      <div class="flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-sm border border-border bg-surface-sunken">
        <audio v-if="option.audioUrl" :src="option.audioUrl" controls class="w-[90%]" />
        <button
          v-else
          type="button"
          data-test="choose-audio"
          :aria-label="t('audioSelectionOptionsEditor.chooseAudioAriaLabel')"
          class="flex flex-col items-center gap-1 text-ink-muted"
          @click="openPicker(option.id)"
        >
          <Music :size="16" aria-hidden="true" />
          <span class="text-[0.6875rem]">{{ t('audioSelectionOptionsEditor.chooseAudio') }}</span>
        </button>
        <button
          v-if="option.audioUrl"
          type="button"
          data-test="choose-audio"
          :aria-label="t('audioSelectionOptionsEditor.changeAudioAriaLabel')"
          class="text-[0.6875rem] font-semibold text-accent"
          @click="openPicker(option.id)"
        >
          {{ t('audioSelectionOptionsEditor.change') }}
        </button>
      </div>
    </template>

    <template #extra="{ option }">
      <input
        type="text"
        data-test="option-label"
        :placeholder="t('audioSelectionOptionsEditor.labelPlaceholder')"
        :value="option.label"
        class="rounded-sm border border-border bg-surface-raised px-2 py-1 text-xs"
        @input="emit('editLabel', option.id, ($event.target as HTMLInputElement).value)"
      />
    </template>

    <template #modal>
      <ImagePickerModal :open="pickerTargetId !== null" kind="audio" @select="onPicked" @close="pickerTargetId = null" />
    </template>
  </OptionsEditorGrid>
</template>
