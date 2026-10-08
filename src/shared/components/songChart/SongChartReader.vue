<script setup lang="ts">
/**
 * A song chart as a learner reads it: its sections, headed by their label (or their kind), with
 * each chord over the word it falls on, and "I played it" for the whole song. A chord with
 * voicings to show is highlighted when tapped and opens its voicing card over the chart; tapping
 * another chord moves the card. A no-chord marking, a chord with nothing to show, and every chord
 * when there's no instrument to draw voicings on, are plain text. Lines wrap between words, so a
 * chord never leaves its word on a narrow screen.
 */
import { Check } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import VoicingCard from '@/shared/components/songChart/VoicingCard.vue'
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
  /** The instrument the chart's voicings are drawn and played on; without one, chords are text. */
  instrument: Instrument | null
}>()

const { t } = useTypedT()
const { chordViewed, markPlayed, played } = useSongChartTracking(() => props.chart)

const chordsById = computed(() => new Map(props.chart.chords.map((c) => [c.chord_definition_id, c])))

/** The chord and voicing an anchor's card opens on; null when it has none to show. */
function cardFor(anchor: Anchor): { chord: ChordDefinition; voicing: ChordVoicing } | null {
  if (!props.instrument) return null
  const chord = anchor.chordDefinitionId ? chordsById.value.get(anchor.chordDefinitionId) : undefined
  const voicing = chord ? openingVoicing(chord, anchor) : null
  return chord && voicing ? { chord, voicing } : null
}

const open = ref<{ anchor: Anchor; chord: ChordDefinition; voicing: ChordVoicing } | null>(null)

function openCard(anchor: Anchor) {
  const card = cardFor(anchor)
  if (!card) return
  open.value = { anchor, ...card }
  chordViewed(anchor, card.chord.chord_definition_id, card.voicing.chord_voicing_id)
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
  <article class="flex flex-col gap-5 pb-28">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold text-ink">{{ chart.title }}</h1>
      <p class="text-sm text-ink-muted">{{ chart.artist }}<span v-if="details"> · {{ details }}</span></p>
    </header>

    <section v-for="(section, sectionIndex) in chart.body.content" :key="sectionIndex" class="flex flex-col gap-1">
      <h2 data-test="section-heading" class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        {{ section.attrs.label ?? t(`songChart.sectionKind.${section.attrs.kind}`) }}
      </h2>

      <template v-for="(line, lineIndex) in section.content" :key="lineIndex">
        <p v-if="line.type === 'comment'" class="text-sm italic text-ink-muted">
          {{ line.content.map((c) => c.text).join('') }}
        </p>
        <p v-else class="flex flex-wrap items-end text-lg leading-tight text-ink">
          <span
            v-for="(segment, i) in lineSegments(line)"
            :key="i"
            :data-test="segment.anchor ? 'chord-segment' : undefined"
            class="inline-flex flex-col whitespace-pre pt-1"
          >
            <template v-if="segment.anchor">
              <button
                v-if="cardFor(segment.anchor)"
                type="button"
                data-test="chord-symbol"
                :aria-pressed="open?.anchor.anchorId === segment.anchor.anchorId"
                class="mb-1 self-start rounded-md px-1 text-sm font-bold"
                :class="open?.anchor.anchorId === segment.anchor.anchorId ? 'bg-accent text-accent-fg' : 'text-accent-text underline underline-offset-4'"
                @click="openCard(segment.anchor)"
              >
                {{ segment.anchor.writtenSymbol }}
              </button>
              <span v-else data-test="chord-symbol" class="mb-1 self-start px-1 text-sm font-bold text-ink-muted">
                {{ segment.anchor.writtenSymbol }}
              </span>
            </template>
            <span data-test="chord-word">{{ segment.text }}</span>
          </span>
        </p>
      </template>
    </section>

    <div v-if="open && instrument" class="fixed bottom-24 right-4 z-10">
      <VoicingCard
        :key="open.anchor.anchorId"
        :written-symbol="open.anchor.writtenSymbol"
        :chord="open.chord"
        :opening-voicing="open.voicing"
        :diagrams="chart.diagrams"
        :instrument="instrument"
        :missing-bass="missingBass(open.anchor, open.chord)"
        @close="open = null"
      />
    </div>

    <div class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-4 py-4">
      <button
        type="button"
        data-test="played-it"
        :aria-pressed="played"
        class="mx-auto flex w-full max-w-[430px] items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold"
        :class="played ? 'bg-success-muted text-ink' : 'bg-accent text-accent-fg'"
        @click="markPlayed"
      >
        <Check v-if="played" :size="18" aria-hidden="true" />
        {{ played ? t('songChart.played') : t('songChart.markPlayed') }}
      </button>
    </div>
  </article>
</template>
