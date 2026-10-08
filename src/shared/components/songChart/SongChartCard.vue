<script setup lang="ts">
/**
 * A song chart, embedded in content, as a card: its title, artist and key, and how it starts,
 * with the chords over the first line. Tapping it opens the chart, the way the page it sits on
 * says (see SONG_CHART_OPENER), else on the chart's own page. It shows nothing while it loads or
 * when the chart can no longer be read, since a learner can do nothing about it. Showing it is
 * not reading the chart, so it sends nothing.
 */
import { Music } from 'lucide-vue-next'
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'

import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { usePublishedSongChart } from '@/shared/composables/usePublishedSongChart'
import { useTypedT } from '@/shared/composables/useTypedT'
import { lineSegments } from '@/shared/utils/songChartReading'

const props = defineProps<{ songChartId: string }>()

const { t } = useTypedT()
const router = useRouter()
const opener = inject(SONG_CHART_OPENER, null)
const { chart } = usePublishedSongChart(props.songChartId)

/** The chart's first lyric line, in pieces with the chord over each; empty when it has none. */
const firstLine = computed(() => {
  for (const section of chart.value?.body.content ?? []) {
    const line = section.content.find((l) => l.type === 'lyricLine')
    if (line && line.type === 'lyricLine') return lineSegments(line)
  }
  return []
})

function open() {
  if (opener) opener(props.songChartId)
  else void router.push({ name: 'song-chart', params: { songChartId: props.songChartId } })
}
</script>

<template>
  <button
    v-if="chart"
    type="button"
    data-test="song-chart-card"
    class="flex w-full flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4 text-left hover:border-accent"
    @click="open"
  >
    <span class="flex items-start justify-between gap-3">
      <span class="flex flex-col">
        <span class="text-base font-bold text-ink">{{ chart.title }}</span>
        <span class="text-sm text-ink-muted">{{ chart.artist }}</span>
      </span>
      <span class="flex items-center gap-1 text-xs font-semibold text-accent-text">
        <Music :size="14" aria-hidden="true" />
        <span v-if="chart.concert_key" data-test="song-chart-card-key">{{ t('songChart.key', { key: chart.concert_key }) }}</span>
      </span>
    </span>
    <span v-if="firstLine.length" data-test="song-chart-card-first-line" class="flex flex-wrap items-end text-sm text-ink">
      <span v-for="(segment, i) in firstLine" :key="i" class="inline-flex flex-col whitespace-pre">
        <span v-if="segment.anchor" data-test="card-chord" class="text-xs font-bold text-accent-text">{{ segment.anchor.writtenSymbol }}</span>
        <span data-test="card-word">{{ segment.text }}</span>
      </span>
    </span>
    <span class="text-xs font-semibold text-accent-text">{{ t('songChart.openChart') }}</span>
  </button>
</template>
