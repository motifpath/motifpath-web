<script setup lang="ts">
/** A dashed drop area that opens the file picker, emitting the one file chosen. */
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(defineProps<{ kind?: 'image' | 'audio' }>(), { kind: 'image' })
const emit = defineEmits<{ select: [file: File] }>()

const { t } = useTypedT()

function onFileChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  if (file) emit('select', file)
}
</script>

<template>
  <label
    class="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken text-sm text-ink-muted"
  >
    <span>{{ t('imagePickerModal.dropHint') }}</span>
    <span class="text-xs text-ink-subtle">{{ t('imagePickerModal.uploadHint') }}</span>
    <input type="file" :accept="kind === 'audio' ? 'audio/*' : 'image/*'" class="hidden" @change="onFileChange" />
  </label>
</template>
