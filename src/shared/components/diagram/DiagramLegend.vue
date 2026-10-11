<script setup lang="ts">
/**
 * Names the diagrams stacked on one board, each beside a swatch of its hue, so they are told apart
 * by name as well as by colour.
 */
import type { LegendEntry } from '@/shared/composables/useEmbeddedDiagram'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ entries: LegendEntry[] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
</script>

<template>
  <ul data-test="diagram-legend" class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted" :aria-label="t('diagramLegend.label')">
    <li v-for="(entry, index) in entries" :key="index" data-test="legend-entry" class="flex items-center gap-1.5">
      <span
        data-test="legend-swatch"
        class="h-3 w-3 shrink-0 rounded-full"
        :class="entry.color ? '' : 'bg-accent'"
        :style="entry.color ? { backgroundColor: entry.color } : undefined"
        aria-hidden="true"
      />
      {{ localizedName(entry.names) }}
    </li>
  </ul>
</template>
