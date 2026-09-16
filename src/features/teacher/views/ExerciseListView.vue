<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'

import { useListExercises } from '@/features/teacher/composables/useListExercises'
import AppBar from '@/shared/components/AppBar.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
const { exercises, isLoading, error, retry } = useListExercises()

const exerciseTypeLabels: Record<string, string> = {
  text_response: 'Text response',
  audio_recognition: 'Audio recognition',
  image_recognition: 'Image recognition',
  image_choice: 'Image choice',
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'teacher-exercises' }" />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        This page is for teachers and admins only — your account doesn't have permission to author exercises.
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-[48px] pb-[80px] pt-10">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-ink">Exercises</h1>
        <RouterLink
          :to="{ name: 'teacher-exercise-new' }"
          data-test="new-exercise"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          New exercise
        </RouterLink>
      </div>

      <StateLoading v-if="isLoading" data-test="loading" noun="exercises" />

      <StateError v-else-if="error" data-test="error" message="We couldn't load the exercises." @retry="retry" />

      <StateEmpty
        v-else-if="exercises.length === 0"
        data-test="empty"
        heading="No exercises yet"
        message="Create your first exercise to start building the reusable pool."
      >
        <template #action>
          <RouterLink :to="{ name: 'teacher-exercise-new' }" class="text-sm font-semibold text-accent-text underline">
            New exercise
          </RouterLink>
        </template>
      </StateEmpty>

      <ul v-else class="flex flex-col gap-2">
        <li v-for="exercise in exercises" :key="exercise.exercise_id">
          <RouterLink
            :to="{ name: 'teacher-exercise-edit', params: { id: exercise.exercise_id } }"
            data-test="exercise-row"
            class="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3"
          >
            <span class="font-semibold text-ink">{{ exercise.title }}</span>
            <span class="text-sm text-ink-subtle">{{ exerciseTypeLabels[exercise.exercise_type] ?? exercise.exercise_type }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>
