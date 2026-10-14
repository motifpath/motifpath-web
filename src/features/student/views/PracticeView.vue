<script setup lang="ts">
/**
 * A lesson's challenge, run in the Practice Shell. Unlike a practice session it gives no feedback
 * along the way: Next commits the choice, Back goes back to change it, and the review after the
 * last exercise is the first place an answer is revealed. × (and Esc, and the browser's back
 * button) goes back to the lesson without asking, since the challenge can always be run again.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import ChallengeReview from '@/features/student/components/ChallengeReview.vue'
import HowToAnswer from '@/features/student/components/HowToAnswer.vue'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import SendToTeacherLink from '@/features/student/components/SendToTeacherLink.vue'
import { useLessonTitles } from '@/features/student/composables/useLessonTitles'
import { usePracticeSession } from '@/features/student/composables/usePracticeSession'
import { practiceReference } from '@/features/student/utils/conciergeLink'
import AppButton from '@/shared/components/AppButton.vue'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeShell from '@/shared/components/PracticeShell.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useOptionKeys } from '@/shared/composables/useOptionKeys'
import { useTypedT } from '@/shared/composables/useTypedT'
import { hasMultipleCorrectOptions } from '@/shared/utils/exerciseOptions'

// A studentPathId means the challenge is taken again from a course or path the student has
// finished: every event says so, and the run starts and ends on that reviewed lesson.
const props = defineProps<{ nodeId: string; studentPathId?: string }>()
const reviewing = computed(() => props.studentPathId !== undefined)

// A getter, not props.nodeId directly — usePracticeSession watches it so a
// route change that reuses this component (same route record, new :nodeId)
// still reloads instead of showing the previous node's session.
const session = usePracticeSession(() => props.nodeId, { review: reviewing.value })
// The lesson's title names every exercise's header and the result. In review, the teacher message
// names the finished course or path instead of My path.
const titles = useLessonTitles(
  () => props.nodeId,
  () => props.studentPathId,
)

const { t } = useTypedT()
const router = useRouter()

const exercise = computed(() => session.currentExercise.value)
const total = computed(() => session.exercises.value.length)
const showsResult = computed(() => session.status.value === 'result')

const position = computed(() =>
  session.status.value === 'in-progress' || showsResult.value
    ? { current: session.currentIndex.value + 1, total: total.value }
    : undefined,
)
// An exercise's segment fills once the student has moved past it; all of them on the result.
const progress = computed(() =>
  session.exercises.value.map((_, index) => (showsResult.value || index < session.currentIndex.value ? 1 : 0)),
)

const allowMultiple = computed(() => hasMultipleCorrectOptions(exercise.value?.options ?? []))
const rightCount = computed(() => (exercise.value?.options ?? []).filter((option) => option.is_correct).length)
const selected = computed(() => session.currentAnswer.value?.optionIds ?? [])

useOptionKeys({
  options: () => exercise.value?.options ?? [],
  multiple: () => allowMultiple.value,
  selected: () => selected.value,
  locked: () => session.status.value !== 'in-progress',
  choose: (optionIds) => session.select(optionIds),
})

const lesson = computed(() =>
  props.studentPathId !== undefined
    ? { name: 'review-lesson', params: { studentPathId: props.studentPathId, nodeId: props.nodeId } }
    : { name: 'node', params: { nodeId: props.nodeId } },
)

/** Back to the lesson: the history entry it came from when there is one, so the lesson isn't stacked twice. */
function leave() {
  if (window.history.state?.back === router.resolve(lesson.value).fullPath) router.back()
  else void router.replace(lesson.value)
}

function finish() {
  // A reviewed lesson's challenge changes nothing, so finishing goes back to that lesson.
  if (reviewing.value) {
    leave()
    return
  }
  // The lesson was completed before the challenge began, so finishing leads to My path, where a
  // finished path or course is celebrated.
  void router.push({ name: 'path' })
}

const scoreTierClasses: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
}
</script>

<template>
  <PracticeShell :exit-label="t('challengeRun.exit')" :position="position" :progress="position ? progress : undefined" @exit="leave">
    <div v-if="session.status.value === 'loading'" data-test="challenge-loading">
      <LoadingSkeleton :count="4" />
    </div>

    <template v-else-if="session.status.value === 'error'">
      <InlineNotice :message="t('challengeRun.errorMessage')" />
      <PracticeActionBar>
        <PrimaryButton data-primary-action class="h-12 w-full" @click="session.retry()">{{ t('buttons.tryAgain') }}</PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else-if="session.status.value === 'empty'">
      <p class="text-ink-muted">{{ t('challengeRun.empty') }}</p>
      <PracticeActionBar>
        <PrimaryButton data-primary-action class="h-12 w-full" @click="leave">{{ t('challengeRun.backToLesson') }}</PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else-if="session.status.value === 'in-progress' && exercise">
      <ExerciseView
        :exercise-type="exercise.exercise_type"
        :prompt="exercise.prompt"
        :options="exercise.options"
        :image-url="exercise.image_url"
        :diagram-ref="exercise.diagram_ref"
        :diagram-stack-ref="exercise.diagram_stack_ref"
        :audio-url="exercise.audio_url"
        breakout
        panes
        :allow-multiple="allowMultiple"
        :choose-count="allowMultiple ? rightCount : undefined"
        :selected-option-ids="selected"
        @update:selected-option-ids="session.select"
      >
        <template #header>
          <ItemHeader :title="titles.lessonTitle.value ?? exercise.title" :tag="t('challengeRun.tag')" />
        </template>
        <template #footer>
          <div class="flex flex-col gap-2">
            <HowToAnswer
              :key="exercise.exercise_id"
              :exercise-type="exercise.exercise_type"
              :allow-multiple="allowMultiple"
              :diagram-stimulus="Boolean(exercise.diagram_ref || exercise.diagram_stack_ref)"
            />
            <p class="text-xs text-ink-muted">{{ t('challengeRun.noAnswersYet') }}</p>
            <SendToTeacherLink
              :reference="practiceReference(props.nodeId, exercise.exercise_id)"
              :path-title="titles.pathTitle.value"
              :lesson-title="titles.lessonTitle.value"
            />
          </div>
        </template>
      </ExerciseView>

      <PracticeActionBar>
        <AppButton v-if="session.currentIndex.value > 0" data-test="back" variant="tertiary" class="h-12 px-4" @click="session.back()">
          {{ t('buttons.back') }}
        </AppButton>
        <PrimaryButton
          data-test="next"
          data-primary-action
          class="ml-auto h-12 flex-1"
          :disabled="!session.canAdvance.value"
          @click="session.next()"
        >
          {{ session.isLastExercise.value ? t('challengeRun.seeResult') : t('challengeRun.next') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else-if="showsResult">
      <header class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold text-ink">{{ t('challengeRun.doneTitle') }}</h1>
        <p class="flex items-center gap-3">
          <span data-test="result-summary" class="text-lg font-semibold text-ink">
            {{ t('challengeRun.resultSummary', { correct: session.score.value.correct, total: session.score.value.total }) }}
          </span>
          <span data-test="result-percent" class="rounded-full px-2.5 py-0.5 text-sm font-semibold" :class="scoreTierClasses[session.scoreTier.value]">
            {{ session.scorePercent.value }}%
          </span>
        </p>
        <p v-if="titles.lessonTitle.value" class="text-sm text-ink-muted">{{ titles.lessonTitle.value }}</p>
      </header>

      <ChallengeReview :entries="session.review.value" />

      <PracticeActionBar>
        <AppButton data-test="back" variant="tertiary" class="h-12 px-4" @click="session.back()">{{ t('buttons.back') }}</AppButton>
        <PrimaryButton data-test="finish" data-primary-action class="ml-auto h-12 flex-1" @click="finish">
          {{ t('challengeRun.finish') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>
  </PracticeShell>
</template>
