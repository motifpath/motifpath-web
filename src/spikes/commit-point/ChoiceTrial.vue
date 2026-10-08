<script setup lang="ts">
/** P2: a MultipleChoice item, committed by Check or by reaching the right count, as the variant says. */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { textPrompt } from '@/spikes/commit-point/items'
import type { ChoiceItem } from '@/spikes/commit-point/items'
import type { Trial } from '@/spikes/commit-point/trialLog'
import { commitsOnSelection, showsRightCount } from '@/spikes/commit-point/variants'
import type { Variant } from '@/spikes/commit-point/variants'

const props = defineProps<{ item: ChoiceItem; variant: Variant }>()
const emit = defineEmits<{ done: [trial: Trial] }>()

const shownAt = performance.now()
const rightIds = props.item.options.filter((option) => option.is_correct).map((option) => option.option_id)
const chosen = ref<string[]>([])
const changedMind = ref(false)
const answer = ref<{ correct: boolean; answerMs: number } | null>(null)

const reveal = computed(() => (answer.value ? { correctOptionIds: rightIds } : undefined))
const prompt = computed(() => (showsRightCount(props.variant) ? `${props.item.prompt} Choose ${rightIds.length}.` : props.item.prompt))

function commit() {
  if (answer.value || chosen.value.length === 0) return
  const correct = chosen.value.length === rightIds.length && chosen.value.every((id) => rightIds.includes(id))
  answer.value = { correct, answerMs: performance.now() - shownAt }
}

function choose(optionIds: string[]) {
  if (answer.value) return
  if (optionIds.length < chosen.value.length) changedMind.value = true
  chosen.value = optionIds
  if (commitsOnSelection(props.variant, optionIds.length, rightIds.length)) commit()
}

const { next } = useAdvanceAfterAnswer(
  () => answer.value,
  () =>
    emit('done', {
      caseId: 'P2',
      variant: props.variant,
      itemKey: props.item.key,
      answerMs: Math.round(answer.value?.answerMs ?? 0),
      outcome: answer.value?.correct ? 'right' : 'wrong',
      changedMind: changedMind.value,
    }),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <ExerciseView
      exercise-type="text_response"
      :prompt="textPrompt(prompt)"
      :options="item.options"
      allow-multiple
      :selected-option-ids="chosen"
      :reveal="reveal"
      @update:selected-option-ids="choose"
    />

    <PracticeActionBar>
      <template v-if="answer">
        <p role="status" class="flex items-center gap-1.5 text-base font-semibold" :class="answer.correct ? 'text-success' : 'text-danger'">
          <CircleCheck v-if="answer.correct" :size="22" aria-hidden="true" />
          <CircleX v-else :size="22" aria-hidden="true" />
          {{ answer.correct ? 'Right' : 'Not quite' }}
        </p>
        <PrimaryButton data-primary-action class="ml-auto h-12 px-6" @click="next">Next</PrimaryButton>
      </template>
      <PrimaryButton v-else-if="variant !== 'B'" data-primary-action class="h-12 w-full" :disabled="chosen.length === 0" @click="commit">
        Check
      </PrimaryButton>
      <p v-else class="w-full text-center text-sm text-ink-muted">{{ chosen.length }} of {{ rightIds.length }} chosen</p>
    </PracticeActionBar>
  </div>
</template>
