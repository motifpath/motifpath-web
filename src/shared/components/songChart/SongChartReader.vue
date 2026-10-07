<script setup lang="ts">
/**
 * A song chart as a learner reads it: its sections of lyrics with each chord over the word it
 * falls on, its comments, and a "played it" control per section. A chord with voicings to show
 * opens its voicing sheet when tapped; a no-chord marking, or a chord with nothing to show, is
 * plain text. Lines wrap between words, so a chord never leaves its word on a narrow screen.
 */
import { computed, ref } from 'vue'
import { Check } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import ChordVoicingSheet from '@/shared/components/songChart/ChordVoicingSheet.vue'
import { useSongChartTracking } from '@/shared/composables/useSongChartTracking'
import { useTypedT } from '@/shared/composables/useTypedT'
import { lineSegments, missingBass, openingVoicing } from '@/shared/utils/songChartReading'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Instrument = components['schemas']['Instrument']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']
type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']

const props = defineProps<{
  chart: LearnerSongChart
  /** The instrument the chart's voicings are drawn and played on. */
  instrument: Instrument
}>()

const { t } = useTypedT()
const { chordViewed, markPlayed, isPlayed } = useSongChartTracking(() => props.chart)

const chordsById = computed(() => new Map(props.chart.chords.map((c) => [c.chord_definition_id, c])))

/** The chord and voicing an anchor's sheet opens on; null when it has none to show. */
function sheetFor(anchor: Anchor): { chord: ChordDefinition; voicing: ChordVoicing } | null {
  const chord = anchor.chordDefinitionId ? chordsById.value.get(anchor.chordDefinitionId) : undefined
  const voicing = chord ? openingVoicing(chord, anchor) : null
  return chord && voicing ? { chord, voicing } : null
}

const open = ref<{ anchor: Anchor; chord: ChordDefinition; voicing: ChordVoicing } | null>(null)

function openSheet(anchor: Anchor) {
  const sheet = sheetFor(anchor)
  if (!sheet) return
  open.value = { anchor, ...sheet }
  chordViewed(anchor, sheet.chord.chord_definition_id, sheet.voicing.chord_voicing_id)
}

const details = computed(() => {
  const c = props.chart
  const parts: string[] = []
  if (c.concert_key) parts.push(t('songChart.key', { key: c.concert_key }))
  if (c.capo_fret > 0) parts.push(t('songChart.capo', { fret: c.capo_fret }))
  if (c.tempo_bpm) parts.push(t('songChart.tempo', { bpm: c.tempo_bpm }))
  return parts.join(' · ')
})
</script>

<template>
  <article class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold text-ink">{{ chart.title }}</h1>
      <p class="text-sm text-ink-muted">{{ chart.artist }}</p>
      <p v-if="details" class="text-sm text-ink-muted">{{ details }}</p>
    </header>

    <section
      v-for="(section, sectionIndex) in chart.body.content"
      :key="sectionIndex"
      class="flex flex-col gap-3"
      :aria-label="section.attrs.label ?? t(`songChart.sectionKind.${section.attrs.kind}`)"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {{ section.attrs.label ?? t(`songChart.sectionKind.${section.attrs.kind}`) }}
        </h2>
        <button
          type="button"
          data-test="section-played"
          :aria-pressed="isPlayed(sectionIndex)"
          class="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold"
          :class="isPlayed(sectionIndex) ? 'border-accent bg-accent text-accent-fg' : 'border-border text-ink'"
          @click="markPlayed(sectionIndex)"
        >
          <Check v-if="isPlayed(sectionIndex)" :size="14" aria-hidden="true" />
          {{ isPlayed(sectionIndex) ? t('songChart.played') : t('songChart.markPlayed') }}
        </button>
      </div>

      <template v-for="(line, lineIndex) in section.content" :key="lineIndex">
        <p v-if="line.type === 'comment'" class="text-sm italic text-ink-muted">
          {{ line.content.map((c) => c.text).join('') }}
        </p>
        <p v-else class="flex flex-wrap items-end text-base leading-tight text-ink">
          <span
            v-for="(segment, i) in lineSegments(line)"
            :key="i"
            :data-test="segment.anchor ? 'chord-segment' : undefined"
            class="inline-flex flex-col whitespace-pre"
          >
            <template v-if="segment.anchor">
              <button
                v-if="sheetFor(segment.anchor)"
                type="button"
                data-test="chord-symbol"
                class="self-start text-sm font-bold text-accent-text hover:underline"
                @click="openSheet(segment.anchor)"
              >
                {{ segment.anchor.writtenSymbol }}
              </button>
              <span v-else data-test="chord-symbol" class="self-start text-sm font-bold text-ink-muted">
                {{ segment.anchor.writtenSymbol }}
              </span>
            </template>
            <span data-test="chord-word">{{ segment.text }}</span>
          </span>
        </p>
      </template>
    </section>

    <ChordVoicingSheet
      v-if="open"
      :written-symbol="open.anchor.writtenSymbol"
      :chord="open.chord"
      :opening-voicing="open.voicing"
      :diagrams="chart.diagrams"
      :instrument="instrument"
      :missing-bass="missingBass(open.anchor, open.chord)"
      @close="open = null"
    />
  </article>
</template>
