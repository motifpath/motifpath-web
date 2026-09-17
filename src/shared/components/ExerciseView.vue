<script setup lang="ts">
import { Volume2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import Icon from '@/shared/components/Icon.vue'
import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']
type ExerciseType = components['schemas']['Exercise']['exercise_type']
type PromptDocument = components['schemas']['PromptDocument']

const props = withDefaults(
  defineProps<{
    exerciseType: ExerciseType
    prompt: PromptDocument
    /**
     * Never pass `is_correct` through to the template — this component
     * renders every option in its neutral, ungraded state on purpose, the
     * same way for an authoring preview and a real student attempt.
     */
    options: Option[]
    /** The exercise's own stimulus, present when exerciseType is image_recognition. */
    imageUrl?: string
    /** The exercise's own stimulus, present when exerciseType is audio_recognition. */
    audioUrl?: string
    /**
     * Whether this exercise legitimately has more than one correct option.
     * The caller derives this from options[].is_correct — never inferred
     * here, since this component must never learn which option(s) are
     * correct, only how many. false (default): clicking a different option
     * replaces the selection (radio). true: clicking toggles that option
     * independently of the others (checkbox).
     */
    allowMultiple?: boolean
    direction?: 'column' | 'row'
  }>(),
  { direction: 'column', allowMultiple: false },
)

/**
 * Uncontrolled when the caller doesn't bind it (the authoring preview never
 * does, and still shows the click highlight from defineModel's own local
 * fallback ref). A caller that does bind it — Practice, to restore an answer
 * on Back — owns the value from then on.
 */
const selected = defineModel<string[]>('selectedOptionIds', { default: () => [] })

function isSelected(optionId: string): boolean {
  return selected.value.includes(optionId)
}

function select(optionId: string): void {
  if (isSelected(optionId)) {
    selected.value = selected.value.filter((id) => id !== optionId)
    return
  }
  selected.value = props.allowMultiple ? [...selected.value, optionId] : [optionId]
}

// Shape says radio-vs-checkbox; fill only applies to a selected checkbox —
// a selected radio stays outline-only, matching the pre-multi-select look.
function indicatorClasses(optionId: string): string[] {
  const shape = props.allowMultiple ? 'rounded-sm' : 'rounded-full'
  if (!isSelected(optionId)) return [shape, 'border-border']
  return props.allowMultiple ? [shape, 'border-accent', 'bg-accent'] : [shape, 'border-accent']
}

const isImageRecognition = computed(() => props.exerciseType === 'image_recognition')
const isTextResponse = computed(() => props.exerciseType === 'text_response')
const isAudioRecognition = computed(() => props.exerciseType === 'audio_recognition')
const isImageChoice = computed(() => props.exerciseType === 'image_choice')
const isAudioSelection = computed(() => props.exerciseType === 'audio_selection')
const isLandscape = computed(() => props.direction === 'row')

// A single shared, hidden player — not one <audio> per option — so clicking
// an option can never overlap two clips: switching always pauses whatever
// was playing before loading and starting the newly clicked one.
const audioPlayerEl = ref<HTMLAudioElement | null>(null)
// Which option's clip the shared player currently holds — distinct from
// isSelected, since selection and playback are click-triggered together but
// track different things (an answer vs. what's audible right now).
const playingOptionId = ref<string | null>(null)

function selectAndPlay(option: Option): void {
  const el = audioPlayerEl.value
  if (!el) return

  select(option.option_id)

  // Clicking the option that's already playing stops it — it must not
  // restart from the top, the way a fresh pick or a switch does. select()
  // above already unanswered it, same as every other exercise type's
  // click-to-deselect behavior.
  if (playingOptionId.value === option.option_id) {
    el.pause()
    playingOptionId.value = null
    return
  }

  if (!option.audio_url) return
  el.pause()
  el.src = option.audio_url
  el.currentTime = 0
  void el.play()
  playingOptionId.value = option.option_id
}
</script>

<template>
  <div data-test="exercise-view-root" class="flex w-full gap-3.5" :class="isLandscape ? 'flex-row' : 'flex-col'">
    <div
      class="text-[15px] font-semibold leading-[1.375rem] text-ink"
      :class="isLandscape ? 'flex-[0_0_40%]' : 'flex-[0_0_auto]'"
    >
      <PromptRenderer :document="prompt" />
    </div>

    <div class="min-w-0" :class="isLandscape ? 'flex-[1_1_60%]' : 'flex-[1_1_auto]'">
      <div v-if="isImageRecognition" class="relative overflow-hidden rounded-[10px] border border-border bg-surface-sunken">
        <img
          v-if="imageUrl"
          data-test="exercise-stimulus-image"
          :src="imageUrl"
          alt=""
          class="block h-auto w-full"
          draggable="false"
        />
        <div
          v-else
          data-test="no-stimulus-image"
          class="flex h-40 items-center justify-center text-xs text-ink-subtle"
        >
          No stimulus image
        </div>
        <div
          v-for="option in options"
          :key="option.option_id"
          data-test="exercise-region"
          :data-selected="isSelected(option.option_id)"
          class="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
          :style="{
            left: `${(option.region?.x ?? 0) * 100}%`,
            top: `${(option.region?.y ?? 0) * 100}%`,
            width: `${(option.region?.width ?? 0) * 100}%`,
            height: `${(option.region?.height ?? 0) * 100}%`,
          }"
          @click="select(option.option_id)"
        >
          <span
            v-if="isSelected(option.option_id)"
            data-test="exercise-region-marker"
            class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised text-accent shadow-level2"
          >
            <Icon name="completed" :size="18" />
          </span>
        </div>
      </div>

      <template v-else-if="isTextResponse || isAudioRecognition">
        <audio
          v-if="isAudioRecognition && audioUrl"
          data-test="exercise-audio-play"
          :src="audioUrl"
          controls
          class="mb-2 w-full"
        />
        <div
          v-else-if="isAudioRecognition"
          data-test="no-stimulus-audio"
          class="mb-2 rounded-md bg-surface-sunken px-[11px] py-[9px] text-xs text-ink-subtle"
        >
          No stimulus audio
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="option in options"
            :key="option.option_id"
            data-test="exercise-option"
            :data-selected="isSelected(option.option_id)"
            class="flex cursor-pointer items-center gap-2 rounded-md border px-[11px] py-[9px]"
            :class="isSelected(option.option_id) ? 'border-accent bg-accent-muted' : 'border-border bg-transparent'"
            @click="select(option.option_id)"
          >
            <div
              data-test="exercise-option-indicator"
              class="h-4 w-4 shrink-0 border-2"
              :class="indicatorClasses(option.option_id)"
            />
            <span class="text-[13px] text-ink">{{ option.label }}</span>
          </div>
        </div>
      </template>

      <div v-else-if="isImageChoice" class="grid grid-cols-2 gap-2">
        <div
          v-for="option in options"
          :key="option.option_id"
          data-test="exercise-option"
          :data-selected="isSelected(option.option_id)"
          class="cursor-pointer overflow-hidden rounded-md border-2"
          :class="isSelected(option.option_id) ? 'border-accent' : 'border-border'"
          @click="select(option.option_id)"
        >
          <div class="flex h-32 w-full items-center justify-center overflow-hidden border-b border-border bg-surface-sunken">
            <img :src="option.image_url" alt="" draggable="false" class="max-h-full max-w-full object-contain" />
          </div>
          <div class="px-2 py-1.5" :class="isSelected(option.option_id) ? 'bg-accent-muted' : 'bg-transparent'">
            <span class="text-xs text-ink">{{ option.label }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="isAudioSelection" class="grid grid-cols-2 gap-2">
        <button
          v-for="option in options"
          :key="option.option_id"
          type="button"
          data-test="exercise-option"
          :data-selected="isSelected(option.option_id)"
          class="flex min-h-[64px] items-center justify-center gap-2 rounded-md border-2 px-3 py-3 text-center text-[13px] font-semibold text-ink"
          :class="isSelected(option.option_id) ? 'border-accent bg-accent-muted' : 'border-border bg-transparent'"
          @click="selectAndPlay(option)"
        >
          <Volume2 :size="16" aria-hidden="true" />
          {{ option.label }}
        </button>
        <audio ref="audioPlayerEl" class="hidden" @ended="playingOptionId = null" />
      </div>
    </div>
  </div>
</template>
