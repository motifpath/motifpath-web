<script setup lang="ts">
import PathContent from '@/features/student/components/PathContent.vue'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'

const { data, error, isLoading, retry } = useStudentPath()
</script>

<template>
  <section>
    <h1 class="mb-4 text-2xl font-semibold text-accent-text">My path</h1>

    <StateLoading v-if="isLoading" data-test="loading" noun="your path" />

    <StateEmpty
      v-else-if="error === 'no-path'"
      data-test="no-path"
      heading="You're all set"
      message="We're building your personalized path. We'll let you know when it's ready."
    />

    <StateError
      v-else-if="error"
      data-test="error"
      message="We couldn't load your path."
      @retry="retry()"
    />

    <PathContent v-else-if="data" :view="data" />
  </section>
</template>
