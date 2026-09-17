<script setup lang="ts">
import { Check, Music, X } from 'lucide-vue-next'
import { ref } from 'vue'

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import type { AudioOption } from '@/features/teacher/composables/useExerciseForm'

const props = withDefaults(defineProps<{ options: AudioOption[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{
  /** A local preview URL to show immediately — not yet uploaded. */
  setPreview: [id: string, previewUrl: string]
  /** The raw file, uploaded only when the exercise is saved. */
  setFile: [id: string, file: File]
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
    const previous = props.options.find((o) => o.id === pickerTargetId.value)?.audioUrl
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
      <div class="relative flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-sm border border-border bg-surface-sunken">
        <audio v-if="option.audioUrl" :src="option.audioUrl" controls class="w-[90%]" />
        <button
          v-else
          type="button"
          data-test="choose-audio"
          aria-label="Choose audio"
          class="flex flex-col items-center gap-1 text-ink-muted"
          @click="openPicker(option.id)"
        >
          <Music :size="16" aria-hidden="true" />
          <span class="text-[0.6875rem]">Choose audio</span>
        </button>
        <button
          v-if="option.audioUrl"
          type="button"
          data-test="choose-audio"
          aria-label="Change audio"
          class="text-[0.6875rem] font-semibold text-accent"
          @click="openPicker(option.id)"
        >
          Change
        </button>
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
      <Music :size="18" aria-hidden="true" />
      <span class="text-[0.8125rem] font-semibold">Add audio option</span>
    </button>

    <ImagePickerModal :open="pickerTargetId !== null" kind="audio" @select="onPicked" @close="pickerTargetId = null" />
  </div>
</template>
