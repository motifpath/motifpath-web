<script setup lang="ts">
/**
 * A song that ends a session, played whole on the instrument in hand from its latest published
 * chart, as written: never transposed. Before it starts, the song says why it was picked, by the
 * section that plays the progression practised today, and shows its chords: on guitar as chord
 * boxes, each strummed when tapped; on bass as a chart of chord symbols, each saying the chord's
 * quality, whose root plays when tapped, since on bass the student plays the root of each chord.
 * The metronome is an aid at the chart's tempo, when it has one; it is never rated.
 *
 * Playing shows the chart with each chord over its word. Tapping a chord opens its chord card over
 * the chart on guitar, as the reader does, and plays its root on bass. Once played, the student
 * rates the song on its own, with no tempo, and the rating shows until they finish: the song is the
 * session's last item. A chart withdrawn since the session was planned can only be skipped.
 */
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import SelfRating from '@/features/student/components/SelfRating.vue'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import ChartBar from '@/shared/components/ChartBar.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import ChordCard from '@/shared/components/songChart/ChordCard.vue'
import ChordStrip from '@/shared/components/songChart/ChordStrip.vue'
import FloatingChordCard from '@/shared/components/songChart/FloatingChordCard.vue'
import SongChartLyrics from '@/shared/components/songChart/SongChartLyrics.vue'
import { useChordSound } from '@/shared/composables/useChordSound'
import { useMetronome } from '@/shared/composables/useMetronome'
import { useProgressionNames } from '@/shared/composables/useProgressionNames'
import { usePublishedSongChart } from '@/shared/composables/usePublishedSongChart'
import { useSongChordCard } from '@/shared/composables/useSongChordCard'
import { useTypedT } from '@/shared/composables/useTypedT'
import { chordDefinitionsOfSong, chordsOfSong, missingBass } from '@/shared/utils/songChartReading'

type Item = components['schemas']['PracticeSessionItem']
type Instrument = components['schemas']['Instrument']
type ChordDefinition = components['schemas']['ChordDefinition']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']

const props = defineProps<{
  /** A song item. */
  item: Item
  /** How the song went, once the student rated it. */
  songRating: TakeRating | null
  /** The instrument whose layout the song is played on; a bass plays the roots it's tapped for. */
  layout: Instrument | null
}>()
const emit = defineEmits<{ rate: [rating: TakeRating]; next: []; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()
const { nameOf } = useProgressionNames()
const sound = useChordSound()

const planned = computed(() => props.item.song!)
const { chart, instrument, isLoading, error, notFound, retry } = usePublishedSongChart(planned.value.song_chart_id)
const onBass = computed(() => planned.value.plays === 'roots')

/** Before the song, while playing it, and once played, being rated. */
const phase = ref<'before' | 'playing' | 'rating'>('before')

const chips = computed(() => {
  const c = chart.value
  if (!c) return []
  return [
    ...(c.concert_key ? [t('songChart.key', { key: c.concert_key })] : []),
    c.capo_fret > 0 ? t('songChart.capo', { fret: c.capo_fret }) : t('songChart.noCapo'),
    ...(c.time_signature ? [`${c.time_signature.beats}/${c.time_signature.beat_value}`] : []),
  ]
})

/** The key and capo beside the title while playing, as the chart is written. */
const keyLine = computed(() => {
  const c = chart.value
  if (!c) return ''
  if (!c.concert_key) return c.capo_fret > 0 ? t('songChart.capo', { fret: c.capo_fret }) : t('songChart.noCapo')
  return c.capo_fret > 0 ? t('sessionSong.keyCapo', { key: c.concert_key, fret: c.capo_fret }) : t('sessionSong.keyNoCapo', { key: c.concert_key })
})

/** Why the song was picked: the section that plays the progression, called by its kind. */
const why = computed(() => {
  const kind = chart.value?.body.content[planned.value.section_index]?.attrs.kind ?? 'other'
  const plays = t(`sessionSong.why.${kind}`, { progression: nameOf(planned.value.progression_key) })
  return `${plays} ${onBass.value ? t('sessionSong.tapToHearRoot') : t('sessionSong.tapToHear')}`
})

const stripChords = computed(() => (chart.value && instrument.value ? chordsOfSong(chart.value.body, chart.value.chords) : []))
const bassChords = computed(() => (chart.value ? chordDefinitionsOfSong(chart.value.body, chart.value.chords) : []))

function strum(chord: ChordDefinition) {
  const voicing = chord.voicings[0]
  const diagram = voicing ? chart.value?.diagrams.find((d) => d.diagram_id === voicing.diagram_id) : undefined
  if (diagram && instrument.value) sound.strum(diagram, instrument.value)
}

function playRoot(chord: ChordDefinition) {
  if (props.layout) sound.playRoot(chord.root, props.layout)
}

// While playing, a chord over the lyrics opens its card on guitar; a bass has no card, since the
// chart's voicings are for guitar.
const card = useSongChordCard(chart, () => (onBass.value ? null : instrument.value), { floating: true })

/** The chord over the lyrics whose root was last played, on bass. */
const rootTapped = ref<string | null>(null)

function chordOf(anchor: Anchor): ChordDefinition | undefined {
  return anchor.chordDefinitionId ? chart.value?.chords.find((c) => c.chord_definition_id === anchor.chordDefinitionId) : undefined
}

function tapLyricChord(anchor: Anchor) {
  if (!onBass.value) {
    card.openFromLyrics(anchor)
    return
  }
  const chord = chordOf(anchor)
  if (!chord) return
  rootTapped.value = anchor.anchorId
  playRoot(chord)
}

const lyricTappable = (anchor: Anchor) => (onBass.value ? chordOf(anchor) !== undefined : card.cardFor(anchor) !== null)
const lyricSelected = computed(() => (onBass.value ? rootTapped.value : (card.open.value?.anchor?.anchorId ?? null)))

const metronome = useMetronome(() => ({
  bpm: chart.value?.tempo_bpm ?? 0,
  beats: chart.value?.time_signature?.beats ?? 4,
  beatValue: chart.value?.time_signature?.beat_value ?? 4,
  noteValue: 'quarters',
}))
// The metronome is an aid for playing; it falls silent once the song is rated.
watch(
  () => props.songRating,
  (rating) => {
    if (rating && metronome.on.value) metronome.toggle()
  },
)

const RESULT_TONES: Record<TakeRating, string> = {
  clean: 'bg-success-muted text-success',
  almost: 'bg-warning-muted text-warning',
  struggled: 'bg-danger-muted text-danger',
}
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-song">
    <template v-if="songRating">
      <p data-test="song-result" class="text-base text-ink-muted">{{ t(`sessionSong.result.${songRating}`, { title: planned.title }) }}</p>
      <div class="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised px-4 py-3">
        <span data-test="song-result-title" class="font-semibold">{{ planned.title }}</span>
        <div class="flex items-center justify-between gap-2">
          <span data-test="song-result-day" class="text-sm text-ink-muted">{{ t('sessionSong.today') }}</span>
          <span data-test="song-result-rating" class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="RESULT_TONES[songRating]">
            {{ t(`playAlongTake.ratings.${songRating}`) }}
          </span>
        </div>
      </div>
      <PracticeActionBar>
        <PrimaryButton data-test="finish-song" data-primary-action class="h-12 w-full" @click="emit('next')">{{ t('sessionSong.finish') }}</PrimaryButton>
      </PracticeActionBar>
    </template>

    <LoadingSkeleton v-else-if="isLoading" />

    <template v-else-if="notFound">
      <InlineNotice tone="unavailable" :message="t('sessionSong.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('sessionSong.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else-if="error || !chart">
      <InlineNotice :message="t('sessionSong.loadFailed')" />
      <PracticeActionBar>
        <PrimaryButton data-test="retry-song" data-primary-action class="h-12 w-full" @click="retry()">{{ t('sessionSong.tryAgain') }}</PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else-if="phase === 'before'">
      <ItemHeader :title="planned.title" :reason="item.reason" />
      <ul class="-mt-2 flex flex-wrap gap-1.5">
        <li v-for="chip in chips" :key="chip" data-test="song-chip" class="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-muted">
          {{ chip }}
        </li>
      </ul>
      <p v-if="onBass" data-test="roots-hint" class="font-medium">{{ t('sessionSong.rootsHint') }}</p>

      <section v-if="onBass && bassChords.length > 0" class="flex flex-col gap-2" :aria-label="t('songChart.chordsInSong')">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ t('songChart.chordsInSong') }}</h3>
        <ol class="grid grid-cols-4 gap-1">
          <li v-for="(chord, i) in bassChords" :key="chord.chord_definition_id">
            <button
              type="button"
              data-test="song-bar"
              class="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              @click="playRoot(chord)"
            >
              <ChartBar :bar="{ kind: 'symbol', symbol: chord.canonical_symbol }" :position="i + 1" />
            </button>
          </li>
        </ol>
      </section>
      <ChordStrip
        v-else-if="!onBass && instrument && stripChords.length > 0"
        :chords="stripChords"
        :diagrams="chart.diagrams"
        :instrument="instrument"
        :voicing-of="(chord) => chord.voicings[0]!"
        layout="row"
        @pick="strum"
      />

      <p data-test="song-why" class="text-ink-muted">{{ why }}</p>

      <button
        v-if="chart.tempo_bpm"
        type="button"
        data-test="song-metronome"
        :aria-pressed="metronome.on.value"
        class="flex min-h-12 items-center gap-3 self-start rounded-full pr-3 text-sm text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="metronome.toggle()"
      >
        {{ metronome.on.value ? t('sessionSong.metronomeOn', { bpm: chart.tempo_bpm }) : t('sessionSong.metronomeOff', { bpm: chart.tempo_bpm }) }}
      </button>

      <PracticeActionBar>
        <PrimaryButton data-test="start-song" data-primary-action class="h-12 w-full" @click="phase = 'playing'">{{ t('sessionSong.start') }}</PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else>
      <header class="flex items-baseline justify-between gap-2">
        <h2 data-test="item-title" class="text-lg font-semibold leading-tight">{{ planned.title }}</h2>
        <span data-test="song-key" class="shrink-0 text-xs text-ink-muted">{{ keyLine }}</span>
      </header>
      <p v-if="onBass" data-test="roots-hint" class="-mt-2 font-medium">{{ t('sessionSong.rootsHint') }}</p>

      <SongChartLyrics :body="chart.body" :is-tappable="lyricTappable" :selected-anchor-id="lyricSelected" @tap="tapLyricChord" />

      <FloatingChordCard v-if="card.open.value && instrument && !onBass" v-model:corner="card.corner.value" :lifted="metronome.on.value">
        <ChordCard
          v-model:voicing-id="card.openVoicingId.value"
          v-model:view="card.view.value"
          v-model:minimized="card.minimized.value"
          :written-symbol="card.open.value.title"
          :chord="card.open.value.chord"
          :diagrams="chart.diagrams"
          :instrument="instrument"
          :missing-bass="card.open.value.anchor ? missingBass(card.open.value.anchor, card.open.value.chord) : null"
          placement="floating"
          @close="card.close()"
        />
      </FloatingChordCard>

      <SelfRating v-if="phase === 'rating'" :song="planned.title" @rate="emit('rate', $event)" />
      <PracticeActionBar v-else>
        <PrimaryButton data-test="played-song" data-primary-action class="h-12 w-full" @click="phase = 'rating'">{{ t('songChart.markPlayed') }}</PrimaryButton>
      </PracticeActionBar>
    </template>
  </div>
</template>
