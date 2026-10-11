<script setup lang="ts">
/**
 * One exercise item of a practice session, answered at its commit point:
 * with one right option the tap is the answer, since latency counts from the prompt and an extra
 * tap would read as slowness; with several, the student is told how many, chooses and then checks.
 * Sound options always wait for Check, since listening is not answering. The parent
 * records the answer. Feedback shows in place: a right answer moves on by itself after a moment
 * (Continue instead when the student asks for reduced motion); a wrong one reveals the right
 * option(s) and waits for Continue, so the student sees where the mistake was.
 *
 * Number keys 1–9 choose options, so a keyboard can answer too.
 *
 * When its sound or picture doesn't load, a notice takes its place, the options lock and the student
 * tries again or skips; an exercise that can't be shown here can only be skipped. A skip is never
 * a wrong answer.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import type { ExerciseAnswer, NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import AppButton from '@/shared/components/AppButton.vue'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useOptionKeys } from '@/shared/composables/useOptionKeys'
import { useTypedT } from '@/shared/composables/useTypedT'
import { hasMultipleCorrectOptions } from '@/shared/utils/exerciseOptions'

type Item = components['schemas']['PracticeSessionItem']
type Exercise = NonNullable<Item['exercise']>

const props = defineProps<{
  /** An exercise item. */
  item: Item
  /** The answer given, once committed. */
  answer: ExerciseAnswer | null
}>()

const emit = defineEmits<{ answer: [optionIds: string[]]; next: []; playing: [playing: boolean]; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()

const exercise = computed<Exercise>(() => props.item.exercise!)
const allowMultiple = computed(() => hasMultipleCorrectOptions(exercise.value.options))
const rightCount = computed(() => exercise.value.options.filter((option) => option.is_correct).length)
/** Whether the student commits with Check rather than with the tap. */
const checksFirst = computed(() => allowMultiple.value || exercise.value.exercise_type === 'audio_selection')

const chosen = ref<string[]>([])
/** Why the stimulus is missing, while it is. */
const missing = ref<NotAnsweredReason | null>(null)
watch(
  () => props.item.item_key,
  () => {
    chosen.value = []
    missing.value = null
  },
)

const missingMessage = computed(() => {
  if (missing.value === 'unavailable') return t('sessionExercise.unavailable')
  return exercise.value.exercise_type === 'audio_recognition' ? t('sessionExercise.soundFailed') : t('sessionExercise.pictureFailed')
})

const shown = computed(() => props.answer?.optionIds ?? chosen.value)

/** The right options, handed to the view only once the answer is in. */
const reveal = computed(() =>
  props.answer
    ? { correctOptionIds: exercise.value.options.filter((option) => option.is_correct).map((option) => option.option_id) }
    : undefined,
)

/** Once answered, the item is done: a stimulus failing afterwards changes nothing the student can do. */
function onStimulusMissing(reason: NotAnsweredReason) {
  if (!props.answer) missing.value = reason
}

function choose(optionIds: string[]) {
  if (props.answer || missing.value) return
  chosen.value = optionIds
  if (!checksFirst.value && optionIds.length === 1) emit('answer', optionIds)
}

const { next } = useAdvanceAfterAnswer(
  () => props.answer,
  () => emit('next'),
)

useOptionKeys({
  options: () => exercise.value.options,
  multiple: () => allowMultiple.value,
  selected: () => chosen.value,
  locked: () => props.answer !== null,
  choose,
})
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-exercise">
    <ExerciseView
      :exercise-type="exercise.exercise_type"
      :prompt="exercise.prompt"
      :options="exercise.options"
      :image-url="exercise.image_url"
      :diagram-ref="exercise.diagram_ref"
      :diagram-stack-ref="exercise.diagram_stack_ref"
      breakout
      panes
      :audio-url="exercise.audio_url"
      :allow-multiple="allowMultiple"
      :selected-option-ids="shown"
      :reveal="reveal"
      @update:selected-option-ids="choose"
      :choose-count="allowMultiple ? rightCount : undefined"
      :stimulus-missing="missing !== null"
      @playing="emit('playing', $event)"
      @stimulus-missing="onStimulusMissing"
    >
      <template #header>
        <ItemHeader :title="exercise.title" :reason="item.reason" />
      </template>
      <template #stimulus-notice>
        <InlineNotice :tone="missing === 'unavailable' ? 'unavailable' : 'error'" :message="missingMessage" />
      </template>
    </ExerciseView>

    <PracticeActionBar>
      <template v-if="missing === 'failed_to_load'">
        <AppButton data-test="skip-item" variant="tertiary" class="h-12 px-4" @click="emit('skip', 'failed_to_load')">
          {{ t('sessionExercise.skip') }}
        </AppButton>
        <PrimaryButton data-test="retry-stimulus" data-primary-action class="h-12 flex-1" @click="missing = null">
          {{ t('buttons.tryAgain') }}
        </PrimaryButton>
      </template>
      <PrimaryButton
        v-else-if="missing === 'unavailable'"
        data-test="skip-item"
        data-primary-action
        class="h-12 w-full"
        @click="emit('skip', 'unavailable')"
      >
        {{ t('sessionExercise.skip') }}
      </PrimaryButton>
      <template v-else-if="answer">
        <p
          data-test="answer-feedback"
          role="status"
          class="flex items-center gap-1.5 text-base font-semibold"
          :class="answer.correct ? 'text-success' : 'text-danger'"
        >
          <CircleCheck v-if="answer.correct" :size="22" aria-hidden="true" />
          <CircleX v-else :size="22" aria-hidden="true" />
          {{ answer.correct ? t('sessionExercise.right') : t('sessionExercise.wrong') }}
        </p>
        <PrimaryButton data-test="next-item" data-primary-action class="ml-auto h-12 px-6" @click="next">
          {{ t('sessionExercise.next') }}
        </PrimaryButton>
      </template>
      <PrimaryButton
        v-else-if="checksFirst"
        data-test="check-answer"
        data-primary-action
        class="h-12 w-full"
        :disabled="chosen.length === 0"
        @click="emit('answer', chosen)"
      >
        {{ t('sessionExercise.check') }}
      </PrimaryButton>
    </PracticeActionBar>
  </div>
</template>
