<script setup lang="ts">
import { computed } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import type { components } from '@/api/generated/core-domain'

type ExerciseType = components['schemas']['Exercise']['exercise_type']

const props = defineProps<{
  open: boolean
  exerciseType: ExerciseType
  allowMultiple: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const interactionText = computed(() => {
  switch (props.exerciseType) {
    case 'image_recognition':
      return props.allowMultiple
        ? 'Tap every area on the image that answers the prompt.'
        : 'Tap the area on the image that answers the prompt.'
    case 'image_choice':
      return props.allowMultiple
        ? 'Tap every image that applies.'
        : 'Tap the image that answers the prompt.'
    default:
      return props.allowMultiple
        ? 'Tap every option that applies.'
        : 'Tap the option that answers the prompt.'
  }
})
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[320px] flex-col gap-3 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-start justify-between gap-3">
      <span class="text-sm font-bold text-ink">How to answer</span>
      <ModalCloseButton @close="emit('close')" />
    </div>
    <p class="text-sm text-ink-muted">{{ interactionText }}</p>
    <p class="text-sm text-ink-muted">
      Tap a selected answer again to clear it. Use <b>‹ Back</b> to revisit and change a previous exercise's answer.
    </p>
  </ModalOverlay>
</template>
