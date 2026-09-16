<script setup lang="ts">
import { Check, ImagePlus, X } from 'lucide-vue-next'
import { ref } from 'vue'

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import type { ImageOption } from '@/features/teacher/composables/useExerciseForm'

const props = withDefaults(defineProps<{ options: ImageOption[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{
  /** A local preview URL to show immediately — not yet uploaded. */
  setPreview: [id: string, previewUrl: string]
  /** The raw file, uploaded only when the exercise is saved. */
  setFile: [id: string, file: File]
  editCaption: [id: string, caption: string]
  toggle: [id: string]
  remove: [id: string]
  add: []
}>()

const pickerTargetId = ref<string | null>(null)

function openPicker(id: string) {
  pickerTargetId.value = id
}
function onPicked(file: File) {
  if (pickerTargetId.value) {
    const previous = props.options.find((o) => o.id === pickerTargetId.value)?.imageUrl
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous)
    emit('setPreview', pickerTargetId.value, URL.createObjectURL(file))
    emit('setFile', pickerTargetId.value, file)
  }
  pickerTargetId.value = null
}
</script>

<template>
  <div class="grid gap-3" :class="compact ? 'grid-cols-2' : 'grid-cols-3'">
    <div
      v-for="option in options"
      :key="option.id"
      class="flex flex-col gap-2 rounded-md border p-2.5"
      :class="option.correct ? 'border-success' : 'border-border'"
    >
      <div class="relative h-[84px] overflow-hidden rounded-sm">
        <button
          type="button"
          data-test="choose-image"
          class="absolute inset-0 flex items-end border border-border bg-surface-sunken p-0"
          @click="openPicker(option.id)"
        >
          <span class="w-full bg-surface-raised px-1.5 py-1 text-left text-xs text-ink-muted">
            {{ option.imageUrl ? 'Change image' : 'Choose image' }}
          </span>
        </button>
        <img
          v-if="option.imageUrl"
          :src="option.imageUrl"
          alt=""
          draggable="false"
          class="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <button
          type="button"
          data-test="option-remove"
          aria-label="Remove option"
          class="absolute right-1 top-1 flex h-[22px] w-[22px] items-center justify-center rounded bg-surface-raised text-ink-subtle"
          @click="emit('remove', option.id)"
        >
          <X :size="12" aria-hidden="true" />
        </button>
      </div>
      <input
        type="text"
        placeholder="Caption (authoring only)"
        class="rounded-sm border border-border bg-surface px-2 py-1.5 text-[0.8125rem]"
        :value="option.caption"
        @change="emit('editCaption', option.id, ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        data-test="option-correct"
        :aria-pressed="option.correct"
        class="flex items-center justify-center gap-1.5 rounded-sm border px-2.5 py-[5px] text-xs font-semibold"
        :class="option.correct ? 'border-success bg-success-muted text-success' : 'border-border bg-surface-raised text-ink-muted'"
        @click="emit('toggle', option.id)"
      >
        <Check v-if="option.correct" :size="12" aria-hidden="true" />
        Correct answer
      </button>
    </div>
    <button
      type="button"
      data-test="add-option"
      class="flex min-h-[150px] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-accent"
      @click="emit('add')"
    >
      <ImagePlus :size="18" aria-hidden="true" />
      <span class="text-[0.8125rem] font-semibold">Add image option</span>
    </button>

    <ImagePickerModal :open="pickerTargetId !== null" @select="onPicked" @close="pickerTargetId = null" />
  </div>
</template>
