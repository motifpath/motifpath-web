<script setup lang="ts">
import { ref } from 'vue'

import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ select: [url: string]; close: [] }>()

const { upload } = useMediaUpload()
const uploading = ref(false)
const error = ref('')

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploading.value = true
  error.value = ''
  try {
    const objectUrl = await upload(file, file.type.startsWith('audio/') ? 'audio' : 'image')
    emit('select', objectUrl)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
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
        <span class="text-base font-bold">Choose an image</span>
        <button
          type="button"
          data-test="close-modal"
          aria-label="Close"
          class="flex h-7 w-7 items-center justify-center rounded bg-surface-sunken text-ink-muted"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <label
        class="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken text-sm text-ink-muted"
      >
        <span v-if="!uploading">Click to choose a file to upload</span>
        <span v-else>Uploading…</span>
        <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onFileChange" />
      </label>

      <p v-if="error" class="text-sm font-semibold text-danger">{{ error }}</p>
    </div>
  </div>
</template>
