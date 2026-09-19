<script setup lang="ts">
import { computed, ref } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

const props = defineProps<{ open: boolean; exercises: Exercise[]; linkedExerciseIds: string[] }>()
const emit = defineEmits<{ select: [exerciseId: string]; close: [] }>()

const search = ref('')

const exerciseTypeLabels: Record<string, string> = {
  text_response: 'Text response',
  audio_recognition: 'Audio recognition',
  image_recognition: 'Image recognition',
  image_choice: 'Image choice',
  audio_selection: 'Audio selection',
}

const availableExercises = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.exercises.filter((exercise) => {
    if (props.linkedExerciseIds.includes(exercise.exercise_id)) return false
    if (!query) return true
    return exercise.title.toLowerCase().includes(query)
  })
})
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[70vh] w-[420px] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-base font-bold">Attach an exercise</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <input
      v-model="search"
      data-test="exercise-picker-search"
      type="text"
      placeholder="Search by title"
      class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
    />

    <p v-if="availableExercises.length === 0" data-test="exercise-picker-empty" class="text-sm text-ink-subtle">
      No exercises match — every exercise in the pool is already attached, or none matched your search.
    </p>

    <ul v-else class="flex flex-col gap-2 overflow-y-auto">
      <li v-for="exercise in availableExercises" :key="exercise.exercise_id">
        <button
          type="button"
          data-test="exercise-picker-row"
          class="flex w-full items-center justify-between rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-left"
          @click="emit('select', exercise.exercise_id)"
        >
          <span class="text-sm font-semibold text-ink">{{ exercise.title }}</span>
          <span class="text-xs text-ink-subtle">{{ exerciseTypeLabels[exercise.exercise_type] ?? exercise.exercise_type }}</span>
        </button>
      </li>
    </ul>
  </ModalOverlay>
</template>
