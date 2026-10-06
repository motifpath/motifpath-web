<script setup lang="ts">
/**
 * One exercise item of a practice session, answered at its commit point:
 * with one right option the tap is the answer, since latency counts from the prompt and an extra
 * tap would read as slowness; with several, the student chooses and then checks. The parent
 * records the answer. Feedback shows in place: a right answer moves on by itself after a moment
 * (Continue instead when the student asks for reduced motion); a wrong one reveals the right
 * option(s) and waits for Continue, so the student sees where the mistake was.
 *
 * Number keys 1–9 choose options, so a keyboard can answer too.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import type { ExerciseAnswer } from '@/features/student/composables/usePracticeSessionRun'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
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

/** The right options, handed to the view only once the answer is in. */
const reveal = computed(() =>
  props.answer
    ? { correctOptionIds: exercise.value.options.filter((option) => option.is_correct).map((option) => option.option_id) }
    : undefined,
)

function choose(optionIds: string[]) {
  if (props.answer) return
  chosen.value = optionIds
  if (!allowMultiple.value && optionIds.length === 1) emit('answer', optionIds)
}

const { next } = useAdvanceAfterAnswer(
  () => props.answer,
  () => emit('next'),
)

function onKeydown(event: KeyboardEvent) {
  if (props.answer || event.defaultPrevented || !/^[1-9]$/.test(event.key)) return
  const option = exercise.value.options[Number(event.key) - 1]
  if (!option) return
  const id = option.option_id
  if (!allowMultiple.value) choose([id])
  else choose(chosen.value.includes(id) ? chosen.value.filter((chosenId) => chosenId !== id) : [...chosen.value, id])
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-exercise">
    <span data-test="item-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[item.reason]) }}
    </span>

    <ExerciseView
      :exercise-type="exercise.exercise_type"
      :prompt="exercise.prompt"
      :options="exercise.options"
      :image-url="exercise.image_url"
      :diagram-ref="exercise.diagram_ref"
      :audio-url="exercise.audio_url"
      :allow-multiple="allowMultiple"
      :selected-option-ids="shown"
      :reveal="reveal"
      @update:selected-option-ids="choose"
    />

    <PracticeActionBar>
      <template v-if="answer">
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
        v-else-if="allowMultiple"
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
