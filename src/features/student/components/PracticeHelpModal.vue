<script setup lang="ts">
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

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

const { t } = useTypedT()

const interactionText = computed(() => {
  switch (props.exerciseType) {
    case 'image_recognition':
      return props.allowMultiple
        ? t('practiceHelpModal.interaction.imageRecognitionMultiple')
        : t('practiceHelpModal.interaction.imageRecognitionSingle')
    case 'image_choice':
      return props.allowMultiple
        ? t('practiceHelpModal.interaction.imageChoiceMultiple')
        : t('practiceHelpModal.interaction.imageChoiceSingle')
    default:
      return props.allowMultiple
        ? t('practiceHelpModal.interaction.defaultMultiple')
        : t('practiceHelpModal.interaction.defaultSingle')
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
      <span class="text-sm font-bold text-ink">{{ t('practiceHelpModal.title') }}</span>
      <ModalCloseButton @close="emit('close')" />
    </div>
    <p class="text-sm text-ink-muted">{{ interactionText }}</p>
    <p class="text-sm text-ink-muted">
      {{ t('practiceHelpModal.clearHintBefore') }} <b>{{ t('common.back') }}</b>
      {{ t('practiceHelpModal.clearHintAfter') }}
    </p>
  </ModalOverlay>
</template>
