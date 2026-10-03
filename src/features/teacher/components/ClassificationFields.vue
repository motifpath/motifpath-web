<script setup lang="ts">
import SkillConceptTreePicker, {
  type TreeNode,
} from '@/shared/components/SkillConceptTreePicker.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type DifficultyLevel = components['schemas']['ClassificationInput']['difficulty_level']
type ReviewState = components['schemas']['Classification']['review_state']

withDefaults(
  defineProps<{
    skillIds: string[]
    conceptIds: string[]
    skillNodes: TreeNode[]
    conceptNodes: TreeNode[]
    skillsLoading?: boolean
    conceptsLoading?: boolean
    skillsError?: boolean
    conceptsError?: boolean
    /** The content's instruments, to list only the nodes that suit them; null lists every node. */
    instrumentIds?: string[] | null
    suggestedSkillIds?: string[]
    suggestedConceptIds?: string[]
    difficultyLevel: DifficultyLevel
    reviewState: ReviewState | null
    /** The viewer may add missing nodes in the knowledge map, so the pickers link there. */
    canCreateNodes?: boolean
  }>(),
  { instrumentIds: null, suggestedSkillIds: () => [], suggestedConceptIds: () => [], canCreateNodes: false },
)
const emit = defineEmits<{
  'update:skillIds': [value: string[]]
  'update:conceptIds': [value: string[]]
  'update:difficultyLevel': [value: DifficultyLevel]
  retrySkills: []
  retryConcepts: []
}>()

const difficultyLevels: DifficultyLevel[] = [
  'beginner',
  'early_intermediate',
  'intermediate',
  'advanced',
  'expert',
]

function isDifficultyLevel(value: string): value is DifficultyLevel {
  return (difficultyLevels as string[]).includes(value)
}

function onDifficultyLevelChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (isDifficultyLevel(value)) emit('update:difficultyLevel', value)
}

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col gap-4">
    <SkillConceptTreePicker
      :label="t('classificationFields.conceptLabel')"
      :nodes="conceptNodes"
      :selected-ids="conceptIds"
      :is-loading="conceptsLoading"
      :load-failed="conceptsError"
      :instrument-ids="instrumentIds"
      :suggested-ids="suggestedConceptIds"
      missing-hint
      :create-kind="canCreateNodes ? 'concept' : null"
      @update:selected-ids="emit('update:conceptIds', $event)"
      @retry="emit('retryConcepts')"
    />

    <SkillConceptTreePicker
      :label="t('classificationFields.skillLabel')"
      :nodes="skillNodes"
      :selected-ids="skillIds"
      :is-loading="skillsLoading"
      :load-failed="skillsError"
      :instrument-ids="instrumentIds"
      :suggested-ids="suggestedSkillIds"
      missing-hint
      :create-kind="canCreateNodes ? 'skill' : null"
      @update:selected-ids="emit('update:skillIds', $event)"
      @retry="emit('retrySkills')"
    />

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">{{
        t('classificationFields.difficultyLevelLabel')
      }}</label>
      <select
        data-test="difficulty-level"
        :value="difficultyLevel"
        class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        @change="onDifficultyLevelChange"
      >
        <option v-for="level in difficultyLevels" :key="level" :value="level">{{ level }}</option>
      </select>
    </div>

    <span
      v-if="reviewState"
      data-test="review-state"
      class="w-fit rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-muted"
    >
      {{ t('classificationFields.reviewLabel', { state: reviewState }) }}
    </span>
  </div>
</template>
