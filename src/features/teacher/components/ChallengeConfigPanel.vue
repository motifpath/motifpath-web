<script setup lang="ts">
defineProps<{
  subjectTag: string
  passThreshold: number
  shuffleExercises: boolean
  shuffleOptions: boolean
}>()
const emit = defineEmits<{
  'update:subjectTag': [value: string]
  'update:passThreshold': [value: number]
  'update:shuffleExercises': [value: boolean]
  'update:shuffleOptions': [value: boolean]
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-semibold">Subject tag</label>
      <input
        data-test="subject-tag"
        type="text"
        :value="subjectTag"
        placeholder="e.g. triad-shapes"
        class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        @input="emit('update:subjectTag', ($event.target as HTMLInputElement).value)"
      />
      <span class="text-xs text-ink-subtle">Must match one of this node's skills or concepts.</span>
    </div>

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
