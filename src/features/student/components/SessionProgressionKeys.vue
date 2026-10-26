<script setup lang="ts">
/**
 * One take of a progression key tour, instrument in hand: the progression in the key the tour is
 * on, written in chord symbols, played along with its backing after a bar of count-in. The take is
 * rated like a play-along's; the parent moves the tour on (a clean take to the next key, a rough
 * one stays) and decides the next take's tempo. A line of five keys around the current one shows
 * where the tour stands, the clean ones ticked.
 *
 * On guitar a chord's card shows on demand, as in a song chart, on the voicing the plan gives,
 * which the backing also strums. On bass the board marks a chord's root, third and fifth, so the line shows whether the
 * chord is major or minor. A key whose chords can't be loaded can only be skipped.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Info } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { useKeyTourChords } from '@/features/student/composables/useKeyTourChords'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import SelfRating from '@/features/student/components/SelfRating.vue'
import { tourWindow } from '@/features/student/utils/keyTour'
import type { TourState } from '@/features/student/utils/keyTour'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import AppButton from '@/shared/components/AppButton.vue'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { MarkedPlace } from '@/shared/components/diagram/DrillFretboard.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import ChordCard from '@/shared/components/songChart/ChordCard.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import type { ChordView } from '@/shared/composables/useChordView'
import { useProgressionPlayback } from '@/shared/composables/useProgressionPlayback'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import { useTempoAsPlayed } from '@/shared/composables/useTempoAsPlayed'
import { useTypedT } from '@/shared/composables/useTypedT'
import { musicKeyMessage } from '@/shared/utils/musicKey'
import { SUGGESTED_NOTE_VALUES, speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Item = components['schemas']['PracticeSessionItem']
type Tour = NonNullable<Item['progression_keys']>

/** The frets a bass line is marked within: the open string and the first five. */
const BASS_FRETS = 5

const props = defineProps<{
  /** A progression_keys item. */
  item: Item
  /** The tempo the next take plays at, in `noteValue`. */
  tempo: number
  noteValue: TempoNoteValue
  takesLeft: number
  takesTotal: number
  /** Where the tour stands: the key the next take is in, and the keys clean. */
  tour: TourState
  /** The bass's open-string pitches, lowest first, its chord tones are marked on; null on guitar. */
  tuning: string[] | null
}>()

const emit = defineEmits<{
  rate: [rating: TakeRating]
  skip: [reason: NotAnsweredReason]
  tempo: [bpm: number]
  noteValue: [value: TempoNoteValue]
}>()

const { t } = useTypedT()
const { asPlayed } = useTempoAsPlayed()

const planned = computed<Tour>(() => props.item.progression_keys!)
const chords = useKeyTourChords(() => props.item, () => props.tour.key)
const chart = computed(() => chords.key.value?.chart ?? [])
const onBass = computed(() => (chords.key.value?.chord_tones.length ?? 0) > 0)

const keyName = (key: string) => t(musicKeyMessage(key))

/** Whether a take clicks the beat, the count-in included. */
const metronome = ref(true)

/** The backing of a take: the chart as many times through as the plan says, after a bar of count-in. */
const source = computed<ProgressionSource | null>(() => {
  const instrument = chords.instrument.value
  if (chords.status.value !== 'ready' || !instrument) return null
  const once = chart.value.map((chord) => chords.diagrams.value[chord]!)
  return {
    chords: Array.from({ length: planned.value.times_through }, () => once).flat(),
    chordInstrument: instrument,
    bass: null,
    tempoBpm: props.tempo,
    noteValue: props.noteValue,
    countInBars: 1,
  }
})
const player = useProgressionPlayback(source)
watch(metronome, (on) => (player.metronome.value = on), { immediate: true })

const phase = ref<'ready' | 'playing' | 'rating'>('ready')
const loadError = ref(false)

function startTake() {
  loadError.value = false
  phase.value = 'playing'
  // Inside the tap: iOS keeps audio started any later silent.
  player.toggle()
}

watch(player.state, (state, previous) => {
  if (phase.value !== 'playing') return
  if (state === 'error') {
    loadError.value = true
    phase.value = 'ready'
  } else if (state === 'idle' && previous === 'playing') {
    phase.value = 'rating'
  }
})

function stopEarly() {
  // Rating first, so the stop's own idle isn't read as the take ending.
  phase.value = 'rating'
  player.stop()
}

/** Drops the take without a rating, back to choosing its tempo, as when it started at the wrong one. */
function restartTake() {
  phase.value = 'ready'
  player.stop()
}

onBeforeUnmount(() => player.stop())

/** The last take rated clean that moved the tour on: its key and tempo, as played. */
const lastClean = ref<{ key: string; bpm: number; noteValue: TempoNoteValue } | null>(null)
let rated: { key: string; bpm: number; noteValue: TempoNoteValue; rating: TakeRating } | null = null

function rate(rating: TakeRating) {
  rated = { key: props.tour.key, bpm: props.tempo, noteValue: props.noteValue, rating }
  phase.value = 'ready'
  emit('rate', rating)
}

watch(
  () => props.tour.key,
  (next, previous) => {
    if (rated?.rating === 'clean' && rated.key === previous) lastClean.value = { key: rated.key, bpm: rated.bpm, noteValue: rated.noteValue }
    rated = null
    selected.value = null
  },
)

const takesPlayed = computed(() => props.takesTotal - props.takesLeft)

/** "Clean in G at 84 BPM · now in A" after a clean take, else "Take 1 of 3 · now in G". */
const meta = computed(() => {
  const now = t('progressionKeys.nowIn', { key: keyName(props.tour.key) })
  if (lastClean.value) {
    const { key, bpm, noteValue } = lastClean.value
    return `${t('progressionKeys.cleanIn', { key: keyName(key), tempo: asPlayed(bpm, noteValue) })} · ${now}`
  }
  const take = t('playAlongTake.takeOf', { current: Math.min(takesPlayed.value + 1, props.takesTotal), total: props.takesTotal })
  return `${take} · ${now}`
})

const windowKeys = computed(() => tourWindow(props.tour.key))

/** The bar sounding now, while a take plays, wrapping around each time through. */
const soundingBar = computed(() => {
  const bar = player.currentBar.value
  return phase.value === 'playing' && bar !== null && chart.value.length > 0 ? bar % chart.value.length : null
})

/** The chord the student tapped, whose box (guitar) or tones (bass) show; null for none. */
const selected = ref<string | null>(null)
/** The chord shown: the one sounding while a take plays, else the one tapped. */
const shown = computed(() => (soundingBar.value !== null ? chart.value[soundingBar.value]! : selected.value))

function choose(chord: string) {
  selected.value = selected.value === chord ? null : chord
}

const view = ref<ChordView>('box')
const minimized = ref(false)
const shownDiagram = computed(() => (shown.value ? (chords.diagrams.value[shown.value] ?? null) : null))
/** The voicing the plan gives the chord shown: the only one its card offers, as the backing strums it. */
const shownVoicing = computed(() => shownDiagram.value?.chord_voicing ?? null)

const shownTones = computed<MarkedPlace[]>(() => {
  const tones = chords.key.value?.chord_tones.find((c) => c.chord === shown.value)
  if (!tones) return []
  return [
    { ...tones.root, role: 'root' },
    { ...tones.third, role: 'third' },
    { ...tones.fifth, role: 'fifth' },
  ]
})

const slowestTempo = computed(() => Math.ceil(planned.value.min_tempo_bpm / speedFactor(props.noteValue)))
const goalMark = computed(() => Math.floor(planned.value.target_tempo_bpm / speedFactor(props.noteValue)))

function chooseTempo(bpm: number) {
  emit('tempo', bpm)
}

const infoOpen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-4" data-test="progression-keys">
    <LoadingSkeleton v-if="chords.status.value === 'loading' && !chords.instrument.value" />

    <template v-else-if="chords.status.value === 'unavailable'">
      <InlineNotice tone="unavailable" :message="t('progressionKeys.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('playAlongTake.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else>
      <ItemHeader :title="t('sessionPlan.tour', { name: planned.progression.name })" :reason="item.reason" />

      <div class="flex items-center gap-1">
        <p data-test="tour-meta" class="text-sm text-ink-muted">{{ meta }}</p>
        <button
          type="button"
          data-test="item-info"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink"
          :aria-label="t('playAlongTake.info')"
          :aria-expanded="infoOpen"
          aria-controls="tour-info"
          @click="infoOpen = !infoOpen"
        >
          <Info :size="18" aria-hidden="true" />
        </button>
      </div>
      <p v-if="infoOpen" id="tour-info" data-test="tour-info" class="text-sm text-ink-muted">{{ t('progressionKeys.info') }}</p>

      <ol data-test="tour-chart" :aria-label="t('progressionKeys.chart', { key: keyName(tour.key) })" class="grid grid-cols-4 gap-1">
        <li v-for="(chord, i) in chart" :key="i">
          <button
            type="button"
            data-test="tour-bar"
            class="flex min-h-[56px] w-full items-center border-l-2 pl-3 text-left text-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            :class="soundingBar === i ? 'border-accent text-accent-text' : shown === chord ? 'border-ink text-ink' : 'border-ink-subtle text-ink'"
            :aria-pressed="selected === chord"
            :aria-label="t(onBass ? 'progressionKeys.showTones' : 'progressionKeys.showBox', { chord })"
            @click="choose(chord)"
          >
            {{ chord }}
          </button>
        </li>
      </ol>

      <p class="text-sm text-ink-muted">
        {{ t('progressionKeys.keys') }}
        <template v-for="(key, i) in windowKeys" :key="key">
          <span v-if="i > 0" aria-hidden="true"> · </span>
          <span data-test="tour-key" :aria-current="key === tour.key ? 'step' : undefined" :class="key === tour.key ? 'font-semibold text-ink' : ''"
            >{{ keyName(key) }}{{ tour.clean.includes(key) ? ' ✓' : '' }}</span
          >
        </template>
      </p>

      <ChordCard
        v-if="shown && !onBass && shownDiagram && shownVoicing && chords.instrument.value"
        v-model:view="view"
        v-model:minimized="minimized"
        :voicing-id="shownVoicing.chord_voicing_id"
        :written-symbol="shown"
        :chord-symbol="shown"
        :voicings="[shownVoicing]"
        :diagrams="[shownDiagram]"
        :instrument="chords.instrument.value"
        :missing-bass="null"
        placement="docked"
        @close="selected = null"
      />
      <section v-if="shown && onBass && tuning" data-test="tour-tones" class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold">{{ t('progressionKeys.tonesOf', { chord: shown }) }}</h3>
        <DrillFretboard :tuning="tuning" :max-fret="BASS_FRETS" :label="t('progressionKeys.tonesOf', { chord: shown })" :places="shownTones" locked />
      </section>
      <p v-else-if="!shown" class="text-xs text-ink-muted">{{ t(onBass ? 'progressionKeys.tapForTones' : 'progressionKeys.tapForBox') }}</p>

      <TempoControl
        :tempo="tempo"
        :slowest="slowestTempo"
        :goal="goalMark"
        :best="null"
        :metronome="metronome"
        :disabled="phase !== 'ready'"
        :note-value="noteValue"
        :note-values="SUGGESTED_NOTE_VALUES"
        @update:metronome="metronome = $event"
        @update:note-value="emit('noteValue', $event)"
        @tempo="chooseTempo"
      />

      <template v-if="phase === 'ready'">
        <p v-if="loadError" class="text-sm text-danger" role="alert">{{ t('playAlongTake.loadError') }}</p>
        <p class="text-xs text-ink-muted">{{ t('progressionKeys.countInHint') }}</p>
        <PracticeActionBar>
          <PrimaryButton data-test="start-take" data-primary-action class="h-12 w-full" :disabled="!source" @click="startTake">
            {{ t('progressionKeys.start', { key: keyName(tour.key) }) }}
          </PrimaryButton>
        </PracticeActionBar>
      </template>

      <template v-else-if="phase === 'playing'">
        <p class="text-sm text-ink-muted">{{ player.currentBar.value === null ? t('progressionKeys.countingIn') : t('playAlongTake.playing') }}</p>
        <PracticeActionBar>
          <AppButton data-test="restart-take" variant="tertiary" class="h-12 px-4" @click="restartTake">
            {{ t('playAlongTake.restart') }}
          </AppButton>
          <AppButton data-test="stop-early" variant="secondary" class="h-12 flex-1" @click="stopEarly">
            {{ t('playAlongTake.stopEarly') }}
          </AppButton>
        </PracticeActionBar>
      </template>

      <SelfRating v-else :bpm="tempo" :note-value="noteValue" @rate="rate" @restart="restartTake" />
    </template>
  </div>
</template>
