<script setup lang="ts">
/**
 * A song chart, embedded in content, as one card to tap: a music icon, its title, its artist and
 * key, a chevron, and how it starts, with the chords over the first line. Tapping it opens the
 * chart, the way the page it sits on says (see SONG_CHART_OPENER), else on the chart's own page.
 * It shows nothing while it loads or when the chart can no longer be read, since a learner can do
 * nothing about it. Showing it is not reading the chart, so it sends nothing.
 */
import { ChevronRight, Music } from 'lucide-vue-next'
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

/** "John Newton · Key G": the artist and the key, whichever the chart has. */
const meta = computed(() => {
  const c = chart.value
  if (!c) return ''
  return [c.artist, c.concert_key ? t('songChart.key', { key: c.concert_key }) : null].filter(Boolean).join(' · ')
})

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
    class="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4 text-left hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    @click="open"
  >
    <span class="flex w-full items-center gap-3">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent-text">
        <Music :size="20" aria-hidden="true" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate text-base font-semibold text-ink">{{ chart.title }}</span>
        <span v-if="meta" data-test="song-chart-card-meta" class="truncate text-xs font-medium text-ink-muted">{{ meta }}</span>
      </span>
      <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
    </span>
    <span v-if="firstLine.length" data-test="song-chart-card-first-line" class="flex w-full flex-wrap items-end rounded-[10px] bg-surface-sunken px-3 py-2 text-sm text-ink">
      <span v-for="(segment, i) in firstLine" :key="i" class="inline-flex flex-col whitespace-pre">
        <span v-if="segment.anchor" data-test="card-chord" class="text-xs font-medium text-accent-text">{{ segment.anchor.writtenSymbol }}</span>
        <span v-else class="h-[18px]" aria-hidden="true" />
        <span data-test="card-word">{{ segment.text }}</span>
      </span>
    </span>
  </button>
</template>
