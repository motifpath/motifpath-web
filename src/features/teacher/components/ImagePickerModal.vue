<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(defineProps<{ open: boolean; kind?: 'image' | 'audio' }>(), { kind: 'image' })
const emit = defineEmits<{ select: [file: File]; close: [] }>()

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  emit('select', file)
}
</script>

<template>
  <div
    v-if="open"
    data-test="image-picker-modal"
    class="fixed inset-0 z-20 flex items-center justify-center bg-black/45"
    @click="emit('close')"
  >
    <div class="flex w-[420px] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-lg" @click.stop>
      <div class="flex items-center justify-between">
        <span class="text-base font-bold">{{ kind === 'audio' ? 'Choose an audio file' : 'Choose an image' }}</span>
        <button
          type="button"
          data-test="close-modal"
          aria-label="Close"
          class="flex h-7 w-7 items-center justify-center rounded bg-surface-sunken text-ink-muted"
          @click="emit('close')"
        >
          <X :size="14" aria-hidden="true" />
        </button>
      </div>

      <label
        class="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken text-sm text-ink-muted"
      >
        <span>Click to choose a file, or drag one here</span>
        <span class="text-xs text-ink-subtle">Uploaded only when you save the exercise</span>
        <input
          type="file"
          :accept="kind === 'audio' ? 'audio/*' : 'image/*'"
          class="hidden"
          @change="onFileChange"
        />
      </label>
    </div>
  </div>
</template>
