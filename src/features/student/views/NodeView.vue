<script setup lang="ts">
import { useRoute } from 'vue-router'

// Placeholder holding screen for the `node` route seam. PB-8e replaces this
// body with the real S6 lesson screen (dynamic video layout, cues,
// mark-complete). Until then, opening a step lands here.
const route = useRoute()
const nodeId = route.params.nodeId as string
</script>

<template>
  <section data-test="node" class="flex flex-col items-start gap-3">
    <h1 class="text-2xl font-semibold text-motif-blue">Lesson</h1>
    <p class="text-motif-ink/70">This lesson isn't available yet.</p>
    <p class="text-sm text-motif-ink/50">We're still building it — check back soon.</p>
    <p class="sr-only" data-test="node-id">{{ nodeId }}</p>
    <RouterLink :to="{ name: 'path' }" class="text-sm font-medium text-motif-blue underline">
      ‹ Back to your path
    </RouterLink>
  </section>
</template>
