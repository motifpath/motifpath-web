<script setup lang="ts">
import SkillConceptTreePicker, { type TreeNode } from '@/features/teacher/components/SkillConceptTreePicker.vue'

defineProps<{
  subjectSkillId: string | undefined
  subjectConceptId: string | undefined
  skillNodes: TreeNode[]
  conceptNodes: TreeNode[]
  /** Restricts the pickable subject to the parent content node's own linked classification. */
  allowedSkillIds?: string[] | null
  allowedConceptIds?: string[] | null
  passThreshold: number
  shuffleExercises: boolean
  shuffleOptions: boolean
}>()
const emit = defineEmits<{
  'update:subjectSkillId': [value: string | undefined]
  'update:subjectConceptId': [value: string | undefined]
  'update:passThreshold': [value: number]
  'update:shuffleExercises': [value: boolean]
  'update:shuffleOptions': [value: boolean]
}>()

function onSkillSelected(ids: string[]) {
  emit('update:subjectSkillId', ids[0])
  if (ids[0]) emit('update:subjectConceptId', undefined)
}

function onConceptSelected(ids: string[]) {
  emit('update:subjectConceptId', ids[0])
  if (ids[0]) emit('update:subjectSkillId', undefined)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">Subject</label>
      <span class="text-xs text-ink-subtle">Exactly one of skill or concept — must be one of this node's own linked skills/concepts.</span>
    </div>

    <SkillConceptTreePicker
      label="Subject skill"
      :nodes="skillNodes"
      :selected-ids="subjectSkillId ? [subjectSkillId] : []"
      :allowed-ids="allowedSkillIds ?? null"
      :multiple="false"
      @update:selected-ids="onSkillSelected"
    />

    <SkillConceptTreePicker
      label="Subject concept"
      :nodes="conceptNodes"
      :selected-ids="subjectConceptId ? [subjectConceptId] : []"
      :allowed-ids="allowedConceptIds ?? null"
      :multiple="false"
      @update:selected-ids="onConceptSelected"
    />

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">Pass threshold (%)</label>
      <input
        data-test="pass-threshold"
        type="number"
        min="1"
        max="100"
        :value="passThreshold"
        class="w-24 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        @input="emit('update:passThreshold', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <label class="flex items-center gap-2 text-sm">
      <input
        data-test="shuffle-exercises"
        type="checkbox"
        :checked="shuffleExercises"
        @change="emit('update:shuffleExercises', ($event.target as HTMLInputElement).checked)"
      />
      Shuffle exercise order per attempt
    </label>

    <label class="flex items-center gap-2 text-sm">
      <input
        data-test="shuffle-options"
        type="checkbox"
        :checked="shuffleOptions"
        @change="emit('update:shuffleOptions', ($event.target as HTMLInputElement).checked)"
      />
      Shuffle option order per attempt
    </label>
  </div>
</template>
