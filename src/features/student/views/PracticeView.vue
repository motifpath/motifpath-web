<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import PracticeHelpModal from '@/features/student/components/PracticeHelpModal.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { usePracticeSession } from '@/features/student/composables/usePracticeSession'
import { hasMultipleCorrectOptions } from '@/shared/utils/exerciseOptions'

const props = defineProps<{ nodeId: string }>()

// A getter, not props.nodeId directly — usePracticeSession watches it so a
// route change that reuses this component (same route record, new :nodeId)
// still reloads instead of showing the previous node's session.
const session = usePracticeSession(() => props.nodeId)

const { t } = useTypedT()

const helpOpen = ref(false)

const progressPercent = computed(() => {
  const total = session.exercises.value.length
  if (total === 0) return 0
  return ((session.currentIndex.value + 1) / total) * 100
})

const allowMultiple = computed(() => hasMultipleCorrectOptions(session.currentExercise.value?.options ?? []))

const scoreTierClasses: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
}
</script>

<template>
  <section data-test="practice">
    <StateLoading v-if="session.status.value === 'loading'" data-test="loading" :noun="t('practiceView.loadingNoun')" />

    <StateError
      v-else-if="session.status.value === 'error'"
      :message="t('practiceView.errorMessage')"
      @retry="session.retry()"
    />

    <div v-else-if="session.status.value === 'empty'" data-test="practice-empty" class="flex flex-col items-start gap-3">
      <p class="text-ink-muted">{{ t('practiceView.empty') }}</p>
      <RouterLink :to="{ name: 'node', params: { nodeId: props.nodeId } }" class="text-sm font-medium text-accent-text underline">
        {{ t('practiceView.backToLesson') }}
      </RouterLink>
    </div>

    <div v-else-if="session.status.value === 'in-progress' && session.currentExercise.value" class="flex flex-col gap-4">
      <div class="flex items-center gap-3 border-b border-border pb-2.5 text-xs text-ink-muted">
        <RouterLink :to="{ name: 'node', params: { nodeId: props.nodeId } }" class="shrink-0">
          {{ t('practiceView.backToLesson') }}
        </RouterLink>
        <div class="h-1 flex-1 overflow-hidden rounded bg-surface-sunken" role="progressbar" :aria-valuenow="session.currentIndex.value + 1" aria-valuemin="1" :aria-valuemax="session.exercises.value.length">
          <div class="h-full bg-accent" :style="{ width: `${progressPercent}%` }" />
        </div>
        <button
          type="button"
          data-test="help-toggle"
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink text-xs font-bold"
          :aria-expanded="helpOpen"
          @click="helpOpen = !helpOpen"
        >
          ?
        </button>
      </div>

      <PracticeHelpModal
        :open="helpOpen"
        :exercise-type="session.currentExercise.value.exercise_type"
        :allow-multiple="allowMultiple"
        @close="helpOpen = false"
      />

      <ExerciseView
        :exercise-type="session.currentExercise.value.exercise_type"
        :prompt="session.currentExercise.value.prompt"
        :options="session.currentExercise.value.options"
        :image-url="session.currentExercise.value.image_url"
        :audio-url="session.currentExercise.value.audio_url"
        :allow-multiple="allowMultiple"
        :selected-option-ids="session.currentAnswer.value?.optionIds ?? []"
        @update:selected-option-ids="session.select"
      />

      <div class="sticky bottom-0 -mx-4 flex items-center justify-between border-t border-border bg-surface px-4 py-3">
        <button
          v-if="session.currentIndex.value > 0"
          type="button"
          data-test="back"
          class="text-xs text-ink-subtle underline"
          @click="session.back()"
        >
          {{ t('common.back') }}
        </button>
        <span v-else />
        <PrimaryButton data-test="next" :disabled="!session.canAdvance.value" @click="session.next()">
          {{ session.isLastExercise.value ? t('practiceView.seeResult') : t('practiceView.next') }}
        </PrimaryButton>
      </div>
    </div>

    <div v-else-if="session.status.value === 'result'" data-test="result" class="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-sunken px-4 py-5 text-center">
      <p class="text-base font-semibold text-ink">
        {{ t('practiceView.resultSummary', { correct: session.score.value.correct, total: session.score.value.total }) }}
      </p>
      <p
        data-test="result-percent"
        class="rounded-full px-3 py-1 text-sm font-semibold"
        :class="scoreTierClasses[session.scoreTier.value]"
      >
        {{ session.scorePercent.value }}%
      </p>
      <PrimaryButton as="RouterLink" data-test="finish" :to="{ name: 'node', params: { nodeId: props.nodeId } }">
        {{ t('practiceView.finish') }}
      </PrimaryButton>
      <button type="button" data-test="result-back" class="text-xs text-ink-subtle underline" @click="session.back()">
        {{ t('common.back') }}
      </button>
    </div>
  </section>
</template>
