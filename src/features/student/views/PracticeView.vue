<script setup lang="ts">
import { computed, ref } from 'vue'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { usePracticeSession } from '@/features/student/composables/usePracticeSession'

const props = defineProps<{ nodeId: string }>()

const session = usePracticeSession(props.nodeId)

const helpOpen = ref(false)

const progressPercent = computed(() => {
  const total = session.exercises.value.length
  if (total === 0) return 0
  return ((session.currentIndex.value + 1) / total) * 100
})
</script>

<template>
  <section data-test="practice">
    <StateLoading v-if="session.status.value === 'loading'" data-test="loading" noun="the practice exercises" />

    <StateError
      v-else-if="session.status.value === 'error'"
      message="We couldn't load this practice exercise."
      @retry="session.retry()"
    />

    <div v-else-if="session.status.value === 'empty'" data-test="practice-empty" class="flex flex-col items-start gap-3">
      <p class="text-ink-muted">There's no practice for this lesson yet.</p>
      <RouterLink :to="{ name: 'node', params: { nodeId: props.nodeId } }" class="text-sm font-medium text-accent-text underline">
        ‹ Back to lesson
      </RouterLink>
    </div>

    <div v-else-if="session.status.value === 'in-progress' && session.currentExercise.value" class="flex flex-col gap-4">
      <div class="flex items-center gap-3 border-b border-border pb-2.5 text-xs text-ink-muted">
        <RouterLink :to="{ name: 'node', params: { nodeId: props.nodeId } }" class="shrink-0">
          ‹ Back to lesson
        </RouterLink>
        <div class="h-[3px] flex-1 overflow-hidden rounded bg-surface-sunken" role="progressbar" :aria-valuenow="session.currentIndex.value + 1" aria-valuemin="1" :aria-valuemax="session.exercises.value.length">
          <div class="h-full bg-ink" :style="{ width: `${progressPercent}%` }" />
        </div>
        <button
          type="button"
          data-test="help-toggle"
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink text-[11px] font-bold"
          :aria-expanded="helpOpen"
          @click="helpOpen = !helpOpen"
        >
          ?
        </button>
      </div>

      <div v-if="helpOpen" data-test="help-panel" class="rounded-md bg-surface-sunken px-3 py-2.5 text-xs text-ink-muted">
        Tap an option to answer. Use <b>‹ Back</b> to revisit and change a previous exercise's answer.
      </div>

      <ExerciseView
        :exercise-type="session.currentExercise.value.exercise_type"
        :prompt="session.currentExercise.value.prompt"
        :options="session.currentExercise.value.options"
        :selected-option-id="session.currentAnswer.value?.optionId ?? null"
        @update:selected-option-id="session.select($event)"
      />

      <div class="flex items-center justify-between">
        <button
          v-if="session.currentIndex.value > 0"
          type="button"
          data-test="back"
          class="text-xs text-ink-subtle underline"
          @click="session.back()"
        >
          ‹ Back
        </button>
        <span v-else />
        <PrimaryButton data-test="next" @click="session.next()">
          {{ session.isLastExercise.value ? 'See result' : 'Next ›' }}
        </PrimaryButton>
      </div>
    </div>

    <div v-else-if="session.status.value === 'result'" data-test="result" class="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-sunken px-4 py-5 text-center">
      <p class="text-base font-semibold text-ink">{{ session.score.value.correct }} of {{ session.score.value.total }} correct</p>
      <PrimaryButton as="RouterLink" data-test="finish" :to="{ name: 'node', params: { nodeId: props.nodeId } }">
        Finish
      </PrimaryButton>
    </div>
  </section>
</template>
