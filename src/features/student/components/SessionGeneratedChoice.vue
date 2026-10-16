<script setup lang="ts">
/**
 * One harmony question of a practice session: a numeral's chord, a chord's numeral or function, a
 * function's chord, or a progression read as a chart, asked the way its plan says and read as the
 * plan reads chords: unnamed boxes on guitar, chord symbols on bass. Nothing sets the right option
 * apart before the answer. The parent records and grades the answer; feedback shows in place, a
 * wrong pick revealing the right one. A question that can't be shown here is skipped, never
 * counted against the student.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import { useGeneratedQuestion } from '@/features/student/composables/useGeneratedQuestion'
import type {
  GeneratedChoiceAnswer,
  GeneratedChoiceGrading,
  GradedGeneratedAnswer,
  NotAnsweredReason,
} from '@/features/student/composables/usePracticeSessionRun'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import DrillQuestion from '@/shared/components/DrillQuestion.vue'
import type { DrillAnswer } from '@/shared/components/DrillQuestion.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

const props = defineProps<{
  /** A diatonic chord, chord function or chart progression item. */
  item: Item
  /** The answer given, graded, once committed. */
  answer: GradedGeneratedAnswer | null
  /** The instrument the session is on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ answer: [answer: GeneratedChoiceAnswer, grading: GeneratedChoiceGrading]; next: []; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()

const { status, view, instrument, prompt, grading } = useGeneratedQuestion(() => props.item)

/** The option picked, shown as picked until the answer is graded. */
const choice = ref<string | null>(null)
watch(
  () => props.item.item_key,
  () => {
    choice.value = props.answer?.choice ?? null
  },
  { immediate: true },
)

const reveal = computed(() => (props.answer ? { right: props.answer.right } : null))

/** Whether the question itself says it can't draw what it must, such as a box with no voicing. */
const cantShow = ref(false)

function onAnswer(answer: DrillAnswer) {
  if (!props.answer) emit('answer', answer, grading.value)
}

const { next } = useAdvanceAfterAnswer(
  () => props.answer,
  () => emit('next'),
)
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-generated-choice">
    <span data-test="item-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[item.reason]) }}
    </span>

    <p v-if="instrumentName" data-test="item-instrument" class="text-sm font-medium text-ink-muted">{{ instrumentName }}</p>

    <div v-if="status === 'loading'" data-test="question-loading">
      <LoadingSkeleton />
    </div>

    <div v-else-if="status === 'unavailable' || !view || cantShow">
      <InlineNotice tone="unavailable" :message="t('sessionGeneratedChoice.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-question" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('practiceSessionView.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </div>

    <template v-else>
      <p data-test="question-prompt" class="text-lg font-semibold">{{ prompt }}</p>
      <DrillQuestion v-model:choice="choice" :view="view" :instrument="instrument" :reveal="reveal" @answer="onAnswer" @missing="cantShow = true" />
    </template>

    <PracticeActionBar v-if="answer">
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
    </PracticeActionBar>
  </div>
</template>
