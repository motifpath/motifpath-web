<script setup lang="ts">
import { LEVEL_CLASS, LEVEL_LABEL } from '@/spikes/practice/labels'
import type { Level } from '@/spikes/practice/model'

defineProps<{ level: Level; fading?: boolean; verified?: boolean }>()
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <span class="rounded-full px-2 py-0.5 text-xs" :class="LEVEL_CLASS[level]">{{ LEVEL_LABEL[level] }}</span>
    <span v-if="fading" class="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs text-ink-muted">fading</span>
    <span v-if="verified" class="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent-text">✓ verified</span>
  </span>
</template>
