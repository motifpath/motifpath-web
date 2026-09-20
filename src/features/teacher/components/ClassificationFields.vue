<script setup lang="ts">
import SkillConceptTreePicker, { type TreeNode } from '@/features/teacher/components/SkillConceptTreePicker.vue'
import type { components } from '@/api/generated/core-domain'

type DifficultyLevel = components['schemas']['ClassificationInput']['difficulty_level']
type ReviewState = components['schemas']['Classification']['review_state']

defineProps<{
  skillIds: string[]
  conceptIds: string[]
  skillNodes: TreeNode[]
  conceptNodes: TreeNode[]
  skillsLoading?: boolean
  conceptsLoading?: boolean
  difficultyLevel: DifficultyLevel
  reviewState: ReviewState | null
}>()
const emit = defineEmits<{
  'update:skillIds': [value: string[]]
  'update:conceptIds': [value: string[]]
  'update:difficultyLevel': [value: DifficultyLevel]
  createSkill: [{ name: string; parentId: string | null }]
  createConcept: [{ name: string; parentId: string | null }]
}>()

const difficultyLevels: DifficultyLevel[] = ['beginner', 'early_intermediate', 'intermediate', 'advanced', 'expert']
</script>

<template>
  <div class="flex flex-col gap-4">
    <SkillConceptTreePicker
      label="Skill"
      :nodes="skillNodes"
      :selected-ids="skillIds"
      :is-loading="skillsLoading"
      @update:selected-ids="emit('update:skillIds', $event)"
      @create="emit('createSkill', $event)"
    />

    <SkillConceptTreePicker
      label="Concept"
      :nodes="conceptNodes"
      :selected-ids="conceptIds"
      :is-loading="conceptsLoading"
      @update:selected-ids="emit('update:conceptIds', $event)"
      @create="emit('createConcept', $event)"
    />

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
