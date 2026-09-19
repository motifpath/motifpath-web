<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useTypedT } from '@/shared/composables/useTypedT'

// Placeholder holding screen for the `node` route seam. A later slice
// replaces this body with the real lesson screen (dynamic video layout,
// cues, mark-complete). Until then, opening a step lands here.
const route = useRoute()
const rawNodeId = route.params.nodeId
// Vue Router types a param as `string | string[]` (array only for a
// repeatable segment, which `:nodeId` isn't) — narrow instead of asserting.
const nodeId = Array.isArray(rawNodeId) ? rawNodeId[0] : rawNodeId

const { t } = useTypedT()
</script>

<template>
  <section data-test="node" class="flex flex-col items-start gap-3">
    <h1 class="text-2xl font-semibold text-accent-text">{{ t('nodeView.heading') }}</h1>
    <p class="text-ink-muted">{{ t('nodeView.unavailable') }}</p>
    <p class="text-sm text-ink-muted">{{ t('nodeView.checkBackSoon') }}</p>
    <p class="sr-only" data-test="node-id">{{ nodeId }}</p>
    <RouterLink
      :to="{ name: 'practice', params: { nodeId } }"
      data-test="practice-link"
      class="text-sm font-medium text-accent-text underline"
    >
      {{ t('nodeView.practiceLink') }}
    </RouterLink>
    <RouterLink :to="{ name: 'path' }" class="text-sm font-medium text-accent-text underline">
      {{ t('nodeView.backToPath') }}
    </RouterLink>
  </section>
</template>
