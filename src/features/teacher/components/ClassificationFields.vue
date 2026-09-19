<script setup lang="ts">
import type { components } from '@/api/generated/core-domain'

type DifficultyLevel = components['schemas']['ClassificationInput']['difficulty_level']
type ReviewState = components['schemas']['Classification']['review_state']

defineProps<{
  skill: string
  concept: string
  difficultyLevel: DifficultyLevel
  reviewState: ReviewState | null
}>()
const emit = defineEmits<{
  'update:skill': [value: string]
  'update:concept': [value: string]
  'update:difficultyLevel': [value: DifficultyLevel]
}>()

const difficultyLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced']
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">Skill</label>
      <input
        data-test="skill"
        type="text"
        :value="skill"
        placeholder="e.g. triad-shapes"
        class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        @input="emit('update:skill', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">Concept</label>
      <input
        data-test="concept"
        type="text"
        :value="concept"
        placeholder="e.g. chord-theory"
        class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        @input="emit('update:concept', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">Difficulty level</label>
      <select
        data-test="difficulty-level"
        :value="difficultyLevel"
        class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        @change="emit('update:difficultyLevel', ($event.target as HTMLSelectElement).value as DifficultyLevel)"
      >
        <option v-for="level in difficultyLevels" :key="level" :value="level">{{ level }}</option>
      </select>
    </div>

    <span
      v-if="reviewState"
      data-test="review-state"
      class="w-fit rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-muted"
    >
      Review: {{ reviewState }}
    </span>
  </div>
</template>
