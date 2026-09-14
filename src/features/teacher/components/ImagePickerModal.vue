<script setup lang="ts">
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'

withDefaults(defineProps<{ open: boolean; kind?: 'image' | 'audio' }>(), { kind: 'image' })
const emit = defineEmits<{ select: [file: File]; close: [] }>()

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  emit('select', file)
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[420px] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-base font-bold">{{ kind === 'audio' ? 'Choose an audio file' : 'Choose an image' }}</span>
      <ModalCloseButton @close="emit('close')" />
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
  </ModalOverlay>
</template>
