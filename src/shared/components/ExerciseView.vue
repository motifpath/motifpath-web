<script setup lang="ts">
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']
type ExerciseType = components['schemas']['Exercise']['exercise_type']

/**
 * image_recognition renders a decorative placeholder fretboard, not the
 * exercise's own image_url — audio_recognition's play control has no real
 * audio source either. Neither stimulus is wired to live data yet; this
 * component only takes exerciseType/prompt/options because nothing upstream
 * produces the real stimulus URLs to pass it yet.
 */
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
    direction?: 'column' | 'row'
  }>(),
  { direction: 'column' },
)

const selected = ref<string | null>(null)
function select(optionId: string): void {
  selected.value = optionId
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
      <div v-if="isImageRecognition" class="relative overflow-hidden rounded-[10px] border border-border">
        <svg width="100%" height="150" viewBox="0 0 760 240" preserveAspectRatio="none" class="block">
          <rect width="760" height="240" class="fill-surface-sunken" />
          <line
            v-for="y in [30, 70, 110, 150, 190]"
            :key="`string-${y}`"
            x1="20"
            :y1="y"
            x2="740"
            :y2="y"
            class="stroke-border"
            stroke-width="2"
          />
          <line
            v-for="x in [140, 260, 380, 500, 620]"
            :key="`fret-${x}`"
            :x1="x"
            y1="20"
            :x2="x"
            y2="220"
            class="stroke-ink-subtle"
            stroke-width="3"
          />
        </svg>
        <div
          v-for="option in options"
          :key="option.option_id"
          data-test="exercise-region"
          :data-selected="selected === option.option_id"
          class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border-2"
          :class="[
            option.region?.shape === 'circle' ? 'rounded-full' : 'rounded-md',
            selected === option.option_id
              ? 'border-accent bg-accent-muted'
              : 'border-border bg-transparent',
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
        <div
          v-if="isAudioRecognition"
          data-test="exercise-audio-play"
          class="mb-2 flex items-center gap-2 rounded-md bg-surface-sunken px-[11px] py-[9px]"
        >
          <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
            <svg width="10" height="10" viewBox="0 0 24 24" class="fill-accent-fg"><path d="M8 5v14l11-7z" /></svg>
          </div>
          <span class="text-xs text-ink-muted">Listen · 0:07</span>
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="option in options"
            :key="option.option_id"
            data-test="exercise-option"
            :data-selected="selected === option.option_id"
            class="flex cursor-pointer items-center gap-2 rounded-md border px-[11px] py-[9px]"
            :class="
              selected === option.option_id
                ? 'border-accent bg-accent-muted'
                : 'border-border bg-transparent'
            "
            @click="select(option.option_id)"
          >
            <div
              class="h-4 w-4 shrink-0 rounded-full border-2"
              :class="selected === option.option_id ? 'border-accent' : 'border-border'"
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
          :data-selected="selected === option.option_id"
          class="cursor-pointer overflow-hidden rounded-md border-2"
          :class="selected === option.option_id ? 'border-accent' : 'border-border'"
          @click="select(option.option_id)"
        >
          <img :src="option.image_url" alt="" class="h-16 w-full border-b border-border object-cover" />
          <div
            class="px-2 py-1.5"
            :class="selected === option.option_id ? 'bg-accent-muted' : 'bg-transparent'"
          >
            <span class="text-xs text-ink">{{ option.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
