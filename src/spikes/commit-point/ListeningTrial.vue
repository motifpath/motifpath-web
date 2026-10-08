<script setup lang="ts">
/**
 * P1: a listening item answered by its tap, then moved on the way the variant says. Plays a
 * real file through the exercise's own player, so replays and cut-offs are the real thing.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { textPrompt } from '@/spikes/commit-point/items'
import type { ListeningItem } from '@/spikes/commit-point/items'
import type { Trial } from '@/spikes/commit-point/trialLog'
import { advanceDelayMs, replayHoldsAdvance } from '@/spikes/commit-point/variants'
import type { Variant } from '@/spikes/commit-point/variants'

const props = defineProps<{ item: ListeningItem; variant: Variant }>()
const emit = defineEmits<{ done: [trial: Trial]; metadata: [loaded: boolean, ms: number | null] }>()

const root = ref<HTMLElement | null>(null)
const shownAt = performance.now()
const chosen = ref<string[]>([])
const answer = ref<{ correct: boolean; at: number; answerMs: number } | null>(null)
const replays = ref(0)
const held = ref(false)
const delay = computed(() => (answer.value ? advanceDelayMs(props.variant, answer.value.correct) : null))

const reveal = computed(() =>
  answer.value ? { correctOptionIds: props.item.options.filter((option) => option.is_correct).map((option) => option.option_id) } : undefined,
)

let timer: ReturnType<typeof setTimeout> | undefined
let finished = false

function playing(): boolean {
  const audio = root.value?.querySelector('audio')
  return !!audio && !audio.paused && !audio.ended
}

function finish(byItself: boolean) {
  if (finished || !answer.value) return
  finished = true
  clearTimeout(timer)
  emit('done', {
    caseId: 'P1',
    variant: props.variant,
    itemKey: props.item.key,
    answerMs: Math.round(answer.value.answerMs),
    outcome: answer.value.correct ? 'right' : 'wrong',
    replaysDuringFeedback: replays.value,
    cutOff: byItself && playing(),
    feedbackMs: Math.round(performance.now() - answer.value.at),
  })
}

function choose(optionIds: string[]) {
  if (answer.value || optionIds.length !== 1) return
  chosen.value = optionIds
  const now = performance.now()
  const correct = props.item.options.some((option) => option.option_id === optionIds[0] && option.is_correct)
  answer.value = { correct, at: now, answerMs: now - shownAt }
  const wait = advanceDelayMs(props.variant, correct)
  if (wait !== null) timer = setTimeout(() => finish(true), wait)
}

function onPlay() {
  if (!answer.value) return
  replays.value++
  if (replayHoldsAdvance(props.variant) && !held.value) {
    held.value = true
    clearTimeout(timer)
  }
}

/** Whether this phone reads an unplayed clip's length, which the session needs to time a listening answer fairly. */
onMounted(() => {
  const probe = new Audio()
  const started = performance.now()
  const settle = setTimeout(() => emit('metadata', false, null), 3000)
  probe.preload = 'metadata'
  probe.addEventListener(
    'loadedmetadata',
    () => {
      clearTimeout(settle)
      emit('metadata', Number.isFinite(probe.duration), Math.round(performance.now() - started))
    },
    { once: true },
  )
  probe.src = `/__spike/audio/${props.item.key}.wav?probe`
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div ref="root" class="flex flex-col gap-4" @play.capture="onPlay">
    <ExerciseView
      exercise-type="audio_recognition"
      :prompt="textPrompt(item.prompt)"
      :options="item.options"
      :audio-url="`/__spike/audio/${item.key}.wav`"
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
        <PrimaryButton data-primary-action class="ml-auto h-12 px-6" @click="finish(false)">Next</PrimaryButton>
        <div v-if="delay && !held" class="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div class="countdown h-full bg-accent" :class="delay > 1000 ? 'countdown-long' : 'countdown-short'" />
        </div>
        <p v-if="held" class="w-full text-sm text-ink-muted">Paused — press Next when you're ready.</p>
      </template>
    </PracticeActionBar>
  </div>
</template>

<style scoped>
.countdown {
  animation: drain linear forwards;
}
.countdown-short {
  animation-duration: 900ms;
}
.countdown-long {
  animation-duration: 2500ms;
}
@keyframes drain {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
