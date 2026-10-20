<script setup lang="ts">
import { ref } from 'vue'

import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ uploading: [value: boolean] }>()

/** The thumbnail's url, or undefined for none. */
const thumbnailUrl = defineModel<string | undefined>({ required: true })

const { t } = useTypedT()
const toast = useToast()
const { uploadThumbnail } = useMediaUpload()

const uploading = ref(false)

// Uploads as soon as a file is picked: the stored url is all the form sends,
// so there is nothing to defer until save.
async function onFileChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const input = event.target
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  emit('uploading', true)
  try {
    thumbnailUrl.value = await uploadThumbnail(file)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('thumbnailField.uploadFailed'))
  } finally {
    uploading.value = false
    emit('uploading', false)
    input.value = ''
  }
}
</script>

<template>
  <div class="flex items-center gap-4">
    <ThumbnailImage :url="thumbnailUrl" size-class="h-20 w-28 rounded-md" />
    <div class="flex flex-wrap items-center gap-2">
      <label
        class="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-ink"
        :class="disabled || uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
      >
        <span data-test="thumbnail-upload">{{
          uploading
            ? t('thumbnailField.uploading')
            : thumbnailUrl
              ? t('thumbnailField.replace')
              : t('thumbnailField.upload')
        }}</span>
        <input
          data-test="thumbnail-file-input"
          type="file"
          accept="image/*"
          class="sr-only"
          :disabled="disabled || uploading"
          @change="onFileChange"
        />
      </label>
      <button
        v-if="thumbnailUrl && !disabled"
        type="button"
        data-test="thumbnail-remove"
        :disabled="uploading"
        class="text-[0.8125rem] font-semibold text-ink-muted underline disabled:cursor-not-allowed"
        @click="thumbnailUrl = undefined"
      >
        {{ t('thumbnailField.remove') }}
      </button>
    </div>
  </div>
</template>
