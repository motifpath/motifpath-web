<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']
type ExerciseType = components['schemas']['Exercise']['exercise_type']

const props = withDefaults(
  defineProps<{
    exerciseType: ExerciseType
    prompt: string
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
    direction?: 'column' | 'row'
  }>(),
  { direction: 'column' },
)

/**
 * Uncontrolled when the caller doesn't bind it (the authoring preview never
 * does, and still shows the click highlight from defineModel's own local
 * fallback ref). A caller that does bind it — Practice, to restore an answer
 * on Back — owns the value from then on. An exercise can have more than one
 * option marked correct, so this is always a set, never a single id.
 */
const selected = defineModel<string[]>('selectedOptionIds', { default: () => [] })

function select(optionId: string): void {
  selected.value = selected.value.includes(optionId)
    ? selected.value.filter((id) => id !== optionId)
    : [...selected.value, optionId]
}

function isSelected(optionId: string): boolean {
  return selected.value.includes(optionId)
}

const isImageRecognition = computed(() => props.exerciseType === 'image_recognition')
const isTextResponse = computed(() => props.exerciseType === 'text_response')
const isAudioRecognition = computed(() => props.exerciseType === 'audio_recognition')
const isImageChoice = computed(() => props.exerciseType === 'image_choice')
const isLandscape = computed(() => props.direction === 'row')
</script>

<template>
  <div data-test="exercise-view-root" class="flex w-full gap-3.5" :class="isLandscape ? 'flex-row' : 'flex-col'">
    <div
      class="text-[15px] font-semibold leading-[1.375rem] text-ink"
      :class="isLandscape ? 'flex-[0_0_40%]' : 'flex-[0_0_auto]'"
    >
      {{ prompt }}
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
          class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border-2"
          :class="[
            option.region?.shape === 'circle' ? 'rounded-full' : 'rounded-sm',
            isSelected(option.option_id) ? 'border-accent bg-accent-muted' : 'border-border bg-transparent',
          ]"
          :style="{
            left: `${(option.region?.x ?? 0) * 100}%`,
            top: `${(option.region?.y ?? 0) * 100}%`,
            width: `${(option.region?.width ?? 0) * 100}%`,
            height: `${(option.region?.height ?? 0) * 100}%`,
          }"
          @click="select(option.option_id)"
        />
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
              class="h-4 w-4 shrink-0 rounded-full border-2"
              :class="isSelected(option.option_id) ? 'border-accent' : 'border-border'"
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
          <div class="h-24 w-full overflow-hidden border-b border-border">
            <img :src="option.image_url" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="px-2 py-1.5" :class="isSelected(option.option_id) ? 'bg-accent-muted' : 'bg-transparent'">
            <span class="text-xs text-ink">{{ option.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
