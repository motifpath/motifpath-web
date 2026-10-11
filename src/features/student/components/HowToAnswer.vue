<script setup lang="ts">
/**
 * "How to answer" for a challenge exercise, opened in place above the options rather than in a
 * dialog, so the exercise stays in view and can still be answered while it is open. Closed by
 * default: most students only need it once.
 */
import { ChevronDown } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useTypedT } from '@/shared/composables/useTypedT'

type ExerciseType = components['schemas']['Exercise']['exercise_type']

const props = withDefaults(
  defineProps<{
    exerciseType: ExerciseType
    allowMultiple: boolean
    /** Whether an image_recognition stimulus is a prebuilt diagram, answered by tapping its markers. */
    diagramStimulus?: boolean
  }>(),
  { diagramStimulus: false },
)

const { t } = useTypedT()
const bodyId = useId()
const open = ref(false)

const interactionText = computed(() => {
  switch (props.exerciseType) {
    case 'image_recognition':
      if (props.diagramStimulus) {
        return props.allowMultiple
          ? t('howToAnswer.interaction.diagramRecognitionMultiple')
          : t('howToAnswer.interaction.diagramRecognitionSingle')
      }
      return props.allowMultiple
        ? t('howToAnswer.interaction.imageRecognitionMultiple')
        : t('howToAnswer.interaction.imageRecognitionSingle')
    case 'image_choice':
      return props.allowMultiple ? t('howToAnswer.interaction.imageChoiceMultiple') : t('howToAnswer.interaction.imageChoiceSingle')
    default:
      return props.allowMultiple ? t('howToAnswer.interaction.defaultMultiple') : t('howToAnswer.interaction.defaultSingle')
  }
})
</script>

<template>
  <div :class="open ? 'flex flex-col gap-2 rounded-xl bg-accent-muted p-4' : ''">
    <button
      type="button"
      data-test="how-to-answer-toggle"
      class="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :class="open ? 'min-h-0' : ''"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="open = !open"
    >
      {{ t('howToAnswer.title') }}
      <ChevronDown :size="16" aria-hidden="true" class="transition-transform motion-reduce:transition-none" :class="open ? 'rotate-180' : ''" />
    </button>
    <p v-if="open" :id="bodyId" data-test="how-to-answer-body" class="text-sm text-ink-muted">
      {{ interactionText }} {{ t('howToAnswer.changeHint') }}
    </p>
  </div>
</template>
