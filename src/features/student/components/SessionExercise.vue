<script setup lang="ts">
/**
 * One exercise item of a practice session: the student chooses, checks the answer once,
 * sees whether it was right, and moves on. The parent records the answer; the choice
 * answered with stays shown and can't be changed.
 */
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { ExerciseAnswer } from '@/features/student/composables/usePracticeSessionRun'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { hasMultipleCorrectOptions } from '@/shared/utils/exerciseOptions'

type Item = components['schemas']['PracticeSessionItem']
type Exercise = NonNullable<Item['exercise']>

const props = defineProps<{
  /** An exercise item. */
  item: Item
  /** The answer given, once checked. */
  answer: ExerciseAnswer | null
}>()

const emit = defineEmits<{ answer: [optionIds: string[]]; next: [] }>()

const { t } = useTypedT()

const exercise = computed<Exercise>(() => props.item.exercise!)
const allowMultiple = computed(() => hasMultipleCorrectOptions(exercise.value.options))

const chosen = ref<string[]>([])
watch(
  () => props.item.item_key,
  () => {
    chosen.value = []
  },
)

const shown = computed(() => props.answer?.optionIds ?? chosen.value)

function choose(optionIds: string[]) {
  if (!props.answer) chosen.value = optionIds
}
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-exercise">
    <span data-test="item-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[item.reason]) }}
    </span>

    <div data-test="exercise-options" :inert="answer !== null">
      <ExerciseView
        :exercise-type="exercise.exercise_type"
        :prompt="exercise.prompt"
        :options="exercise.options"
        :image-url="exercise.image_url"
        :diagram-ref="exercise.diagram_ref"
        :audio-url="exercise.audio_url"
        :allow-multiple="allowMultiple"
        :selected-option-ids="shown"
        @update:selected-option-ids="choose"
      />
    </div>

    <div v-if="answer" class="flex flex-wrap items-center gap-3">
      <p
        data-test="answer-feedback"
        role="status"
        class="rounded-full px-3 py-1 text-sm font-semibold"
        :class="answer.correct ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger'"
      >
        {{ answer.correct ? t('sessionExercise.right') : t('sessionExercise.wrong') }}
      </p>
      <PrimaryButton data-test="next-item" class="ml-auto" @click="emit('next')">{{ t('sessionExercise.next') }}</PrimaryButton>
    </div>
    <PrimaryButton v-else data-test="check-answer" class="self-start" :disabled="chosen.length === 0" @click="emit('answer', chosen)">
      {{ t('sessionExercise.check') }}
    </PrimaryButton>
  </div>
</template>
