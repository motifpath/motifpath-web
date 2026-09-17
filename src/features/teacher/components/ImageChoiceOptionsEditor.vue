<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import OptionsEditorGrid from '@/features/teacher/components/OptionsEditorGrid.vue'
import { useOptionMediaPicker } from '@/features/teacher/composables/useOptionMediaPicker'
import type { ImageOption } from '@/features/teacher/composables/useExerciseForm'

const props = withDefaults(defineProps<{ options: ImageOption[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{
  /** A local preview URL to show immediately — not yet uploaded. */
  setPreview: [id: string, previewUrl: string]
  /** The raw file, uploaded only when the exercise is saved. */
  setFile: [id: string, file: File]
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
</script>

<template>
  <OptionsEditorGrid
    :options="options"
    :compact="compact"
    :add-icon="ImagePlus"
    add-label="Add image option"
    @toggle="emit('toggle', $event)"
    @remove="emit('remove', $event)"
    @add="emit('add')"
  >
    <template #media="{ option }">
      <div class="relative h-[84px] overflow-hidden rounded-sm border border-border bg-surface-sunken">
        <img
          v-if="option.imageUrl"
          :src="option.imageUrl"
          alt=""
          draggable="false"
          class="absolute inset-0 h-full w-full object-contain"
        />
        <button
          type="button"
          data-test="choose-image"
          :aria-label="option.imageUrl ? 'Change image' : 'Choose image'"
          class="absolute inset-0 flex items-center justify-center"
          @click="openPicker(option.id)"
        >
          <span v-if="!option.imageUrl" class="flex flex-col items-center gap-1 text-ink-muted">
            <ImagePlus :size="16" aria-hidden="true" />
            <span class="text-[0.6875rem]">Choose image</span>
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
      <ImagePickerModal :open="pickerTargetId !== null" @select="onPicked" @close="pickerTargetId = null" />
    </template>
  </OptionsEditorGrid>
</template>
