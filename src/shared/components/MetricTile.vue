<script setup lang="ts">
/**
 * One number with its label and an optional caption, such as a change against the week before.
 * Only a gain is coloured; anything else stays neutral, so a quieter week never reads as alarm.
 * Given a destination, the whole tile is the link.
 */
import type { RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    label: string
    value: number
    caption?: string
    captionTone?: 'positive' | 'neutral'
    to?: RouteLocationRaw
  }>(),
  { caption: undefined, captionTone: 'neutral', to: undefined },
)
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface-raised p-3.5"
    :class="to ? 'hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus' : undefined"
  >
    <!-- Labels and captions wrap rather than truncate: pt-BR runs longer than English. -->
    <span data-test="metric-label" class="text-xs font-medium text-ink-muted">{{ label }}</span>
    <span data-test="metric-value" class="text-xl font-bold tabular-nums text-ink">{{ value }}</span>
    <span v-if="caption" data-test="metric-caption" class="text-xs font-medium" :class="captionTone === 'positive' ? 'text-success' : 'text-ink-muted'">
      {{ caption }}
    </span>
  </component>
</template>
