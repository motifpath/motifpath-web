<script setup lang="ts">
import { computed } from 'vue'

import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { groupPathSections } from '@/features/student/utils/groupPathSections'

const { data, error, isLoading, retry } = useStudentPath()

const sections = computed(() => (data.value ? groupPathSections(data.value.items) : []))
</script>

<template>
  <section>
    <h1 class="mb-4 text-2xl font-semibold text-motif-blue">My path</h1>

    <p v-if="isLoading" data-test="loading" class="text-motif-ink/60">Loading your path…</p>

    <div v-else-if="error === 'no-path'" data-test="no-path" class="flex flex-col items-start gap-2">
      <h2 class="text-lg font-medium">You're all set!</h2>
      <p class="text-motif-ink/70">Your teacher is building your personalized path.</p>
      <p class="text-sm text-motif-ink/60">
        Check back soon — it'll show up here as soon as it's ready.
      </p>
    </div>

    <ErrorRetryNotice v-else-if="error" message="We couldn't load your path." @retry="retry()" />

    <div v-else-if="data" data-test="path">
      <h2 class="text-lg font-medium">{{ data.title }}</h2>
      <p class="mb-4 text-sm text-motif-ink/60">{{ data.items.length }} steps</p>

      <div
        v-for="(section, index) in sections"
        :key="index"
        data-test="path-section"
        class="mb-4"
      >
        <h3
          v-if="section.label"
          data-test="section-heading"
          class="mb-1 text-sm font-semibold uppercase tracking-wide text-motif-ink/70"
        >
          {{ section.label }}
        </h3>
        <ol class="flex flex-col gap-1">
          <li
            v-for="step in section.items"
            :key="step.content_node_id"
            data-test="path-step"
            class="flex items-baseline justify-between gap-3"
          >
            <span>{{ step.title }}</span>
            <span data-test="step-status" class="text-xs text-motif-ink/50">{{ step.status }}</span>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
