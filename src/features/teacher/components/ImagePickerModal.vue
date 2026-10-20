<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import FileDropField from '@/features/teacher/components/FileDropField.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'

withDefaults(defineProps<{ open: boolean; kind?: 'image' | 'audio' }>(), { kind: 'image' })
const emit = defineEmits<{ select: [file: File]; close: [] }>()

const { t } = useTypedT()
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[420px] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-base font-bold">{{
        kind === 'audio' ? t('imagePickerModal.chooseAudioFile') : t('imagePickerModal.chooseImage')
      }}</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <FileDropField :kind="kind" @select="emit('select', $event)" />
  </ModalOverlay>
</template>
