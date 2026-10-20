<script setup lang="ts">
/**
 * How a published song chart starts: its first section's heading and up to four of its lines, with
 * each chord over its word, so a teacher picking a chart can tell it is the right one. Nothing shows
 * until the chart has loaded.
 */
import { computed } from 'vue'

import { usePublishedSongChart } from '@/shared/composables/usePublishedSongChart'
import { useTypedT } from '@/shared/composables/useTypedT'
import { lineSegments } from '@/shared/utils/songChartReading'

const OPENING_LINE_COUNT = 4

const props = defineProps<{ songChartId: string }>()

const { t } = useTypedT()
const { chart } = usePublishedSongChart(props.songChartId)

const opening = computed(() => {
  const section = chart.value?.body.content[0]
  if (!section) return null
  const lines = section.content.flatMap((line) => (line.type === 'lyricLine' ? [lineSegments(line)] : [])).slice(0, OPENING_LINE_COUNT)
  return { heading: section.attrs.label ?? t(`songChart.sectionKind.${section.attrs.kind}`), lines }
})
</script>

<template>
  <div v-if="opening" class="flex flex-col gap-1">
    <h3 data-test="opening-heading" class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ opening.heading }}</h3>
    <p v-for="(line, i) in opening.lines" :key="i" data-test="opening-line" class="flex flex-wrap items-end text-base text-ink">
      <span v-for="(segment, j) in line" :key="j" class="inline-flex flex-col whitespace-pre">
        <span v-if="segment.anchor" data-test="opening-chord" class="h-6 text-sm font-semibold text-accent-text">{{ segment.anchor.writtenSymbol }}</span>
        <span v-else class="h-6" aria-hidden="true" />
        <span class="leading-6">{{ segment.text }}</span>
      </span>
    </p>
  </div>
</template>
