<script setup lang="ts">
/**
 * A song chart as a learner reads it, taking the whole screen: a bar with × and the metronome, the
 * title, artist and the song's details as chips, the chords in this song and the progressions it
 * plays, then its sections, headed by their label (or their kind) and the progressions each plays,
 * with each chord over the word it falls on, and "I played it" for the whole song at the bottom. Lines wrap between words, so a chord never leaves its word.
 *
 * Tapping a chord over the lyrics or in the strip opens its chord card. On a phone or a tablet the
 * card floats over the chart, which keeps scrolling; on a wide screen it docks in a side pane with
 * the metronome, the chords and the progressions in this song, and closing it collapses the pane. The metronome is a
 * practice aid at the tempo the student chose for this song; the song's own tempo is the target.
 *
 * A preview of a draft is the same reader under a banner, and sends nothing.
 */
import { Check, Eye, Metronome, X } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChordCard from '@/shared/components/songChart/ChordCard.vue'
import ChordStrip from '@/shared/components/songChart/ChordStrip.vue'
import FloatingChordCard from '@/shared/components/songChart/FloatingChordCard.vue'
import SongChartLyrics from '@/shared/components/songChart/SongChartLyrics.vue'
import SongProgressions from '@/shared/components/songChart/SongProgressions.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import { useMetronome } from '@/shared/composables/useMetronome'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useSongChartTracking } from '@/shared/composables/useSongChartTracking'
import { useSongChordCard } from '@/shared/composables/useSongChordCard'
import { useSongTempo } from '@/shared/composables/useSongTempo'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MAX_TEMPO_BPM, TEMPO_STEP_BPM } from '@/shared/utils/sequence'
import { chordsOfSong, missingBass, progressionsOfSong } from '@/shared/utils/songChartReading'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Instrument = components['schemas']['Instrument']

const props = withDefaults(
  defineProps<{
    chart: LearnerSongChart
    /** The instrument the chart's voicings are drawn and played on; without one, chords are text. */
    instrument: Instrument | null
    /** An admin's preview of a draft: shown under a banner, and nothing is sent. */
    preview?: boolean
  }>(),
  { preview: false },
)
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const toast = useToast()
const { sizeClass } = useSizeClass()
const expanded = computed(() => sizeClass.value === 'expanded')
const { chordViewed, markPlayed, played } = useSongChartTracking(() => props.chart)

// ── The song's details ──────────────────────────────────────────────────────

const chips = computed(() => {
  const c = props.chart
  return [
    ...(c.concert_key ? [t('songChart.key', { key: c.concert_key })] : []),
    c.capo_fret > 0 ? t('songChart.capo', { fret: c.capo_fret }) : t('songChart.noCapo'),
    ...(c.time_signature ? [`${c.time_signature.beats}/${c.time_signature.beat_value}`] : []),
    ...(c.tempo_bpm ? [t('songChart.tempo', { bpm: c.tempo_bpm })] : []),
    ...(props.preview ? [t('songChart.draft')] : []),
  ]
})

// The title moves into the bar once the header has scrolled away.
const header = ref<HTMLElement | null>(null)
const headerOutOfView = ref(false)
let headerObserver: IntersectionObserver | null = null
onMounted(() => {
  if (!header.value || typeof IntersectionObserver === 'undefined') return
  headerObserver = new IntersectionObserver(([entry]) => {
    headerOutOfView.value = entry ? !entry.isIntersecting : false
  })
  headerObserver.observe(header.value)
})
onUnmounted(() => headerObserver?.disconnect())

// ── Chords and the chord card ───────────────────────────────────────────────

const songChords = computed(() => (props.instrument ? chordsOfSong(props.chart.body, props.chart.chords) : []))
const songProgressions = computed(() => progressionsOfSong(props.chart.body))

const card = useSongChordCard(
  () => props.chart,
  () => props.instrument,
  {
    floating: () => !expanded.value,
    onViewed: (origin, chordId, voicingId) => {
      if (!props.preview) chordViewed(origin, chordId, voicingId)
    },
  },
)
const { open, openVoicingId, view, minimized, corner, cardFor, openFromLyrics, openFromStrip, stripVoicing } = card
const closeCard = card.close

// ── The metronome ───────────────────────────────────────────────────────────

const { tempo, target, setTempo } = useSongTempo(props.chart.song_chart_id, props.chart.tempo_bpm)
// A chart has no timing to play faster, so its metronome clicks the beat only, in the chart's bar.
const metronome = useMetronome(() => ({
  bpm: tempo.value,
  beats: props.chart.time_signature?.beats ?? 4,
  beatValue: props.chart.time_signature?.beat_value ?? 4,
  noteValue: 'quarters',
}))
const SLOWEST_BPM = 40

/** Where the student is against the song's tempo: "Song tempo 72 BPM" and "you're at 56". */
const tempoNote = computed(() =>
  target === null
    ? { target: null, current: t('songChart.atTempo', { bpm: tempo.value }) }
    : { target: t('songChart.songTempo', { bpm: target }), current: t('songChart.youreAt', { bpm: tempo.value }) },
)

function nudgeTempo(by: number) {
  setTempo(Math.min(MAX_TEMPO_BPM, Math.max(SLOWEST_BPM, tempo.value + by)))
}

/** On a wide screen the pane holds the metronome, the chords and the card; it opens with either. */
const paneOpen = computed(() => expanded.value && (open.value !== null || metronome.on.value))

function onKeydown(event: KeyboardEvent) {
  if (!expanded.value || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]')) return
  if (event.key === 'm' || event.key === 'M') metronome.toggle()
  else if (event.key === '-') nudgeTempo(-TEMPO_STEP_BPM)
  else if (event.key === '+' || event.key === '=') nudgeTempo(TEMPO_STEP_BPM)
  else return
  event.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// ── I played it ─────────────────────────────────────────────────────────────

function playedIt() {
  if (played.value) return
  if (props.preview) {
    played.value = true
    return
  }
  markPlayed()
  toast.success(t('songChart.playedToast', { title: props.chart.title }))
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface">
    <header class="sticky top-0 z-40 flex items-center gap-1 bg-surface py-1 pl-2 pr-4">
      <button
        type="button"
        data-test="close-song-chart"
        class="flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('songChartPage.close')"
        @click="emit('close')"
      >
        <X :size="24" aria-hidden="true" />
      </button>
      <p data-test="reader-title" class="min-w-0 flex-1 truncate text-base font-semibold text-ink">
        <template v-if="preview">{{ t('songChart.previewTitle') }}</template>
        <template v-else-if="headerOutOfView">{{ chart.title }}</template>
      </p>
      <button
        type="button"
        data-test="reader-metronome"
        class="flex size-12 items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :class="metronome.on.value ? 'bg-accent-muted text-accent-text' : 'hover:bg-surface-sunken'"
        :aria-pressed="metronome.on.value"
        :aria-label="t('tempoControl.metronome')"
        @click="metronome.toggle()"
      >
        <Metronome :size="24" aria-hidden="true" />
      </button>
    </header>

    <p v-if="preview" data-test="preview-banner" class="flex items-center gap-2 bg-warning-muted px-4 py-2 text-sm font-semibold text-ink">
      <Eye :size="16" aria-hidden="true" />
      {{ t('songChart.previewBanner') }}
    </p>

    <div class="flex flex-1 justify-center">
      <article class="flex w-full max-w-[560px] flex-col gap-5 px-6 pb-48 pt-1 md:mx-auto">
        <div ref="header" class="flex flex-col gap-1">
          <h1 data-test="song-title" class="text-[28px] font-bold leading-[34px] text-ink">{{ chart.title }}</h1>
          <p v-if="chart.artist" data-test="song-artist" class="text-base text-ink-muted">{{ chart.artist }}</p>
          <ul class="flex flex-wrap gap-1.5 pt-1.5">
            <li v-for="chip in chips" :key="chip" data-test="song-chip" class="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-muted">
              {{ chip }}
            </li>
          </ul>
        </div>

        <ChordStrip
          v-if="instrument && songChords.length > 0 && !paneOpen"
          :chords="songChords"
          :diagrams="chart.diagrams"
          :instrument="instrument"
          :voicing-of="stripVoicing"
          layout="row"
          @pick="openFromStrip"
        />
        <SongProgressions v-if="songProgressions.length > 0 && !paneOpen" :keys="songProgressions" />

        <SongChartLyrics
          :body="chart.body"
          :is-tappable="(anchor) => cardFor(anchor) !== null"
          :selected-anchor-id="open?.anchor?.anchorId ?? null"
          @tap="openFromLyrics"
        />
      </article>

      <aside
        v-if="paneOpen"
        data-test="reader-pane"
        class="sticky top-14 flex h-[calc(100dvh-3.5rem)] w-[400px] shrink-0 flex-col gap-6 self-start overflow-y-auto bg-surface-sunken p-6"
      >
        <section data-test="pane-metronome" class="flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ t('tempoControl.metronome') }}</h2>
          <p data-test="tempo-note" class="text-xs font-medium text-ink-muted">
            <template v-if="tempoNote.target">{{ tempoNote.target }} · </template><span class="text-accent-text">{{ tempoNote.current }}</span>
          </p>
          <TempoControl
            :tempo="tempo"
            :slowest="SLOWEST_BPM"
            :goal="target"
            :goal-label="target === null ? undefined : t('songChart.songTempo', { bpm: target })"
            :best="null"
            :metronome="metronome.on.value"
            :disabled="false"
            @tempo="setTempo"
            @update:metronome="metronome.toggle()"
          />
          <p class="text-xs text-ink-subtle">{{ t('songChart.metronomeKeys') }}</p>
        </section>

        <ChordStrip
          v-if="instrument && songChords.length > 0"
          :chords="songChords"
          :diagrams="chart.diagrams"
          :instrument="instrument"
          :voicing-of="stripVoicing"
          layout="wrap"
          @pick="openFromStrip"
        />
        <SongProgressions v-if="songProgressions.length > 0" :keys="songProgressions" />

        <ChordCard
          v-if="open && instrument"
          v-model:voicing-id="openVoicingId"
          v-model:view="view"
          v-model:minimized="minimized"
          :written-symbol="open.title"
          :chord="open.chord"
          :diagrams="chart.diagrams"
          :instrument="instrument"
          :missing-bass="open.anchor ? missingBass(open.anchor, open.chord) : null"
          placement="docked"
          @close="closeCard"
        />
      </aside>
    </div>

    <FloatingChordCard v-if="open && instrument && !expanded" v-model:corner="corner" :lifted="metronome.on.value">
      <ChordCard
        v-model:voicing-id="openVoicingId"
        v-model:view="view"
        v-model:minimized="minimized"
        :written-symbol="open.title"
        :chord="open.chord"
        :diagrams="chart.diagrams"
        :instrument="instrument"
        :missing-bass="open.anchor ? missingBass(open.anchor, open.chord) : null"
        placement="floating"
        @close="closeCard"
      />
    </FloatingChordCard>

    <div class="fixed bottom-0 left-0 z-20 flex flex-col" :class="paneOpen ? 'right-[400px]' : 'right-0'">
      <div v-if="metronome.on.value && !expanded" data-test="tempo-bar" class="flex justify-center border-t border-border bg-surface px-6 pb-1.5 pt-2.5">
        <div class="flex w-full max-w-[560px] flex-col gap-1">
          <p data-test="tempo-note" class="text-xs font-medium text-ink-muted">
            <template v-if="tempoNote.target">{{ tempoNote.target }} · </template><span class="text-accent-text">{{ tempoNote.current }}</span>
          </p>
          <TempoControl
            :tempo="tempo"
            :slowest="SLOWEST_BPM"
            :goal="target"
            :goal-label="target === null ? undefined : t('songChart.songTempo', { bpm: target })"
            :best="null"
            :metronome="metronome.on.value"
            :disabled="false"
            @tempo="setTempo"
            @update:metronome="metronome.toggle()"
          />
        </div>
      </div>
      <div class="flex justify-center border-t border-border bg-surface px-6 pb-7 pt-3">
        <button
          type="button"
          data-test="played-it"
          :aria-pressed="played"
          class="flex h-12 w-full max-w-[560px] items-center justify-center gap-2 rounded-full px-6 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :class="played ? 'bg-success-muted text-ink' : 'bg-accent text-accent-fg'"
          @click="playedIt"
        >
          <Check v-if="played" :size="18" aria-hidden="true" />
          {{ played ? t('songChart.played') : t('songChart.markPlayed') }}
        </button>
      </div>
    </div>
  </div>
</template>
