<script setup lang="ts">
/**
 * The review after a challenge's last exercise, the first place its answers are revealed: each
 * exercise with the answer the student moved on with, marked right or wrong, and the right one
 * under a wrong answer. An exercise answered on its stimulus (image regions, diagram markers) has
 * options with no names to list, so it shows the stimulus with the answer marked on it instead.
 * A listening exercise whose sound was a diagram reveals that diagram under the answer.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'

import type { ReviewEntry } from '@/features/student/composables/usePracticeSession'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import WhatYouHeard from '@/shared/components/WhatYouHeard.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ entries: ReviewEntry[] }>()

const { t } = useTypedT()

/** Whether every option to list has a name; otherwise the answer is shown on the stimulus. */
function listsByName(entry: ReviewEntry): boolean {
  return [...entry.chosen, ...entry.missed].every(({ option }) => Boolean(option.label))
}

function rightOptionIds(entry: ReviewEntry): string[] {
  return entry.exercise.options.filter((option) => option.is_correct).map((option) => option.option_id)
}

const rowClasses = {
  right: 'border-success bg-success-muted',
  wrong: 'border-danger bg-danger-muted',
} as const
</script>

<template>
  <section class="flex flex-col gap-3" :aria-label="t('challengeRun.review.heading')">
    <ol class="flex flex-col gap-6">
      <li v-for="entry in entries" :key="entry.exercise.exercise_id" data-test="review-entry" class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-ink-muted">{{ t('challengeRun.review.exercise', { number: entry.number }) }}</p>

        <template v-if="listsByName(entry)">
          <div class="text-sm font-semibold text-ink"><PromptRenderer :document="entry.exercise.prompt" /></div>
          <p
            v-if="entry.chosen.length === 0"
            data-test="review-answer"
            data-mark="wrong"
            class="rounded-xl border-2 px-4 py-3 text-base"
            :class="rowClasses.wrong"
          >
            {{ t('challengeRun.review.noAnswer') }}
          </p>
          <div
            v-for="answer in entry.chosen"
            :key="answer.option.option_id"
            data-test="review-answer"
            :data-mark="answer.right ? 'right' : 'wrong'"
            class="flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-2 text-base text-ink"
            :class="answer.right ? rowClasses.right : rowClasses.wrong"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-ink-muted">
              {{ answer.key }}
            </span>
            <span class="flex-1">{{ t('challengeRun.review.yourAnswer', { label: answer.option.label ?? '' }) }}</span>
            <CircleCheck v-if="answer.right" :size="24" class="shrink-0 text-success" aria-hidden="true" />
            <CircleX v-else :size="24" class="shrink-0 text-danger" aria-hidden="true" />
            <span class="sr-only">{{ answer.right ? t('challengeRun.review.right') : t('challengeRun.review.wrong') }}</span>
          </div>
          <div
            v-for="missed in entry.missed"
            :key="missed.option.option_id"
            data-test="review-right-answer"
            data-mark="right"
            class="flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-2 text-base text-ink"
            :class="rowClasses.right"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-ink-muted">
              {{ missed.key }}
            </span>
            <span class="flex-1">{{ t('challengeRun.review.rightAnswer', { label: missed.option.label ?? '' }) }}</span>
            <CircleCheck :size="24" class="shrink-0 text-success" aria-hidden="true" />
            <span class="sr-only">{{ t('challengeRun.review.right') }}</span>
          </div>
          <WhatYouHeard
            v-if="entry.exercise.exercise_type === 'audio_recognition' && entry.exercise.diagram_ref"
            :sound="entry.exercise.diagram_ref"
            class="mt-2"
          />
        </template>

        <ExerciseView
          v-else
          :exercise-type="entry.exercise.exercise_type"
          :prompt="entry.exercise.prompt"
          :options="entry.exercise.options"
          :image-url="entry.exercise.image_url"
          :diagram-ref="entry.exercise.diagram_ref"
          :diagram-stack-ref="entry.exercise.diagram_stack_ref"
          :selected-option-ids="entry.chosen.map(({ option }) => option.option_id)"
          :reveal="{ correctOptionIds: rightOptionIds(entry) }"
        />
      </li>
    </ol>
  </section>
</template>
