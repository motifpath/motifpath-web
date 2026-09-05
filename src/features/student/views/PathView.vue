<script setup lang="ts">
import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import { useStudentPath } from '@/features/student/composables/useStudentPath'

const { data, error, isLoading, retry } = useStudentPath()
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
      <p class="text-sm text-motif-ink/60">{{ data.items.length }} steps</p>
    </div>
  </section>
</template>
