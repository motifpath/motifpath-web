<script setup lang="ts">
/**
 * A take of changes between two chords, back and forth, one change on every beat: on guitar both
 * chord boxes, on bass both roots marked on the board, every chord named.
 *
 * Ready: the metronome row starts at the plan's tempo, its best clean tempo and goal marked, and
 * the student may set another, the metronome ticking while they try it. Starting the take gives a
 * bar of count-in, then ten cycles, from → to → from, two beats each, counted down, with nothing to
 * tap, both hands being on the instrument, but Restart: it throws the take away and is ready again
 * at the same tempo. Leaving the session also ends it early; either way nothing is sent. When the
 * tenth cycle ends the metronome stops and four buttons ask what share of the changes rang clean;
 * picking one sends the tempo played and the share. On bass the take sounds each root on its beat
 * in the bass's own voice, never a chord, with the click, and the take keeps the player's time: its
 * count-in waits for the roots to load and it ends when they have played through, or goes back to
 * ready, saying so, when they can't load. A chord that can't be drawn here, or a
 * bass that isn't known, can only be skipped, as not answered.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import { useChordBoxes } from '@/features/student/composables/useChordBoxes'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import { CLEAN_SHARES } from '@/features/student/utils/changeShare'
import type { CleanShare } from '@/features/student/utils/changeShare'
import { bassWindow, boardFretsFor } from '@/features/student/utils/chordPlaces'
import AppButton from '@/shared/components/AppButton.vue'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { MarkedPlace } from '@/shared/components/diagram/DrillFretboard.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetronomeRow from '@/shared/components/MetronomeRow.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeBreakout from '@/shared/components/PracticeBreakout.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useMetronome } from '@/shared/composables/useMetronome'
import { useProgressionPlayback } from '@/shared/composables/useProgressionPlayback'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import { frettedPitch } from '@/shared/utils/pitch'
import { MAX_TEMPO_BPM } from '@/shared/utils/sequence'

type Item = components['schemas']['PracticeSessionItem']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  /** A chord_change item, or a root_change item on bass. */
  item: Item
  /** The bass a root change is on: its tuning draws the board, its voice sounds the roots. */
  bass?: Instrument
  /** The instrument the item is on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ save: [tempoBpm: number, cleanSharePercent: CleanShare]; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()

/** The bar of count-in before the take: one bar of 4/4. */
const COUNT_IN_BEATS = 4
/** A cycle is from → to → from: two changes, one a beat. */
const BEATS_PER_CYCLE = 2
/** The slowest tempo a take is played at, as the ladder never goes below it. */
const SLOWEST_BPM = 20
/** How often the beat is read while the take runs. */
const TICK_MS = 50

const change = computed(() => props.item.chord_change ?? props.item.root_change!)
const onBass = computed(() => props.item.root_change !== undefined)
const take = computed(() => change.value.take)
const pair = computed(() => ({ from: change.value.from_chord_symbol, to: change.value.to_chord_symbol }))
const title = computed(() => (onBass.value ? t('sessionPlan.chords.rootChange', pair.value) : t('sessionPlan.chords.change', pair.value)))

const chords = useChordBoxes(() => (props.item.chord_change ? [props.item.chord_change.from_diagram_id, props.item.chord_change.to_diagram_id] : []))
const boxes = computed(() =>
  chords.boxes.value.map((box, i) => ({ ...box, symbol: i === 0 ? pair.value.from : pair.value.to })),
)

const roots = computed<MarkedPlace[]>(() => {
  const roots = props.item.root_change
  if (!roots) return []
  return [
    { ...roots.from_root, role: 'root', chord: roots.from_chord_symbol },
    { ...roots.to_root, role: 'root', chord: roots.to_chord_symbol },
  ]
})

const tuning = computed(() => props.bass?.tuning ?? null)
const window = computed(() => (props.item.root_change ? bassWindow(props.item.root_change.window_start_fret) : null))
const boardFrets = computed(() => Math.max(boardFretsFor(roots.value), window.value?.to ?? 0))

const status = computed(() => {
  if (onBass.value) return tuning.value ? 'ready' : 'unavailable'
  return chords.status.value
})

const tempo = ref(clampTempo(take.value.start_tempo_bpm))

function clampTempo(bpm: number): number {
  return Math.min(MAX_TEMPO_BPM, Math.max(SLOWEST_BPM, Math.round(bpm)))
}

const metronome = useMetronome(() => ({ bpm: tempo.value, beats: COUNT_IN_BEATS, beatValue: 4, noteValue: 'quarters' }))

const phase = ref<'ready' | 'counting_in' | 'running' | 'share'>('ready')
/** Count-in beats still to come. */
const countIn = ref(0)
/** Beats played since the count-in. */
const beatsPlayed = ref(0)

const totalBeats = computed(() => take.value.cycles * BEATS_PER_CYCLE)
const cyclesLeft = computed(() => Math.max(0, take.value.cycles - Math.floor(beatsPlayed.value / BEATS_PER_CYCLE)))

/** On bass, the take's sound: each root on its beat, from → to, after a bar of count-in, in the bass's voice. */
const rootsSource = computed<ProgressionSource | null>(() => {
  const roots = props.item.root_change
  if (!roots || !props.bass || !tuning.value) return null
  const from = frettedPitch(tuning.value, roots.from_root.string, roots.from_root.fret)
  const to = frettedPitch(tuning.value, roots.to_root.string, roots.to_root.fret)
  if (from === null || to === null) return null
  const bars = Math.ceil(totalBeats.value / COUNT_IN_BEATS)
  return {
    chords: [],
    chordInstrument: null,
    bass: { instrument: props.bass, bars: Array.from({ length: bars }, () => [from, to, from, to]) },
    tempoBpm: tempo.value,
    countInBars: 1,
  }
})
const player = useProgressionPlayback(rootsSource)
/** Whether the bass's player keeps the take's beat: its click and roots on one clock. */
const playsRoots = computed(() => rootsSource.value !== null)

let timer: ReturnType<typeof setInterval> | undefined
let startedAt = 0

function stopTimer() {
  clearInterval(timer)
  timer = undefined
}

/**
 * Beats since the count-in began: by the bass's clock while it sounds the roots, which start only
 * once loaded (null until then), else by the time since Start, as the metronome starts at once.
 */
function beatsSinceStart(): number | null {
  const beatMs = 60_000 / tempo.value
  if (!playsRoots.value) return Math.floor((Date.now() - startedAt) / beatMs)
  const musicMs = player.musicMs()
  return musicMs === null ? null : COUNT_IN_BEATS + Math.floor(musicMs / beatMs)
}

/** Reads the clock: the count-in beat, then the beats played, until the last cycle ends. */
function tick() {
  const beats = beatsSinceStart()
  if (beats === null) return
  if (beats < COUNT_IN_BEATS) {
    countIn.value = COUNT_IN_BEATS - beats
    return
  }
  phase.value = 'running'
  countIn.value = 0
  beatsPlayed.value = Math.min(totalBeats.value, beats - COUNT_IN_BEATS)
  if (beatsPlayed.value >= totalBeats.value) takeOver()
}

/** The roots couldn't load, so the take is back to ready, saying so. */
const loadError = ref(false)

function startTake() {
  loadError.value = false
  // Inside the tap: browsers only let audio start from one.
  if (playsRoots.value) {
    metronome.stop()
    player.metronome.value = true
    player.toggle()
  } else {
    metronome.start()
  }
  phase.value = 'counting_in'
  countIn.value = COUNT_IN_BEATS
  beatsPlayed.value = 0
  startedAt = Date.now()
  stopTimer()
  timer = setInterval(tick, TICK_MS)
}

/** Throws the take away, count-in included, and is ready again at the tempo set. */
function restartTake() {
  stopTimer()
  metronome.stop()
  if (playsRoots.value) player.stop()
  countIn.value = 0
  beatsPlayed.value = 0
  phase.value = 'ready'
}

function takeOver() {
  stopTimer()
  metronome.stop()
  if (playsRoots.value) player.stop()
  phase.value = 'share'
}

// The bass's player ends a take that has played through, or that couldn't load.
watch(player.state, (state, previous) => {
  if (!playsRoots.value || (phase.value !== 'counting_in' && phase.value !== 'running')) return
  if (state === 'error') {
    stopTimer()
    countIn.value = 0
    beatsPlayed.value = 0
    loadError.value = true
    phase.value = 'ready'
  } else if (state === 'idle' && previous === 'playing') {
    takeOver()
  }
})

function chooseTempo(bpm: number) {
  if (phase.value === 'ready') tempo.value = clampTempo(bpm)
}

function toggleMetronome() {
  if (phase.value === 'ready') metronome.toggle()
}

function pick(share: CleanShare) {
  if (phase.value === 'share') emit('save', tempo.value, share)
}

onBeforeUnmount(stopTimer)

/** The beat the row lights: the bass player's while it plays the take, else the metronome's. */
const litBeat = computed(() => (playsRoots.value && phase.value !== 'ready' ? player.beat.value : metronome.beat.value))

/** Above the chords: what to do, then once the take is over what to say about it. */
const meta = computed(() => {
  if (phase.value === 'share') return onBass.value ? t('sessionChord.shareQuestionBass') : t('sessionChord.shareQuestion')
  return t('sessionChord.cyclesMeta', { cycles: take.value.cycles })
})
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-chord-change">
    <LoadingSkeleton v-if="status === 'loading'" />

    <template v-else-if="status === 'unavailable'">
      <InlineNotice tone="unavailable" :message="t('sessionChord.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('sessionChord.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else>
      <p v-if="instrumentName" data-test="item-instrument" class="-mb-2 text-sm font-medium text-ink-muted">{{ instrumentName }}</p>
      <ItemHeader :title="title" :reason="item.reason" />
      <p data-test="change-meta" class="text-ink-muted">{{ meta }}</p>

      <PracticeBreakout v-if="onBass && tuning">
        <DrillFretboard :tuning="tuning" :max-fret="boardFrets" :fret-window="window" :label="t('sessionChord.bassChangeBoard', pair)" :places="roots" locked />
      </PracticeBreakout>
      <div v-else-if="chords.instrument.value" class="flex justify-center gap-6">
        <div v-for="box in boxes" :key="box.diagram.diagram_id" data-test="pair-chord" class="flex flex-col items-center gap-1">
          <span data-test="pair-chord-name" class="text-lg font-semibold">{{ box.symbol }}</span>
          <ChordBox :voicing="box.voicing" :diagram="box.diagram" :instrument="chords.instrument.value" :label="box.symbol" />
        </div>
      </div>

      <template v-if="phase === 'share'">
        <PracticeActionBar>
          <div role="group" :aria-label="t('sessionChord.shares')" class="grid w-full grid-cols-4 gap-2">
            <button
              v-for="(share, index) in CLEAN_SHARES"
              :key="share"
              type="button"
              data-test="clean-share"
              aria-pressed="false"
              :aria-keyshortcuts="String(index + 1)"
              class="flex min-h-12 items-center justify-center rounded-lg border border-border p-3 text-base font-semibold text-ink"
              @click="pick(share)"
            >
              {{ t('sessionChord.share', { share }) }}
            </button>
          </div>
        </PracticeActionBar>
      </template>

      <template v-else>
        <MetronomeRow
          :beats="COUNT_IN_BEATS"
          :lit="litBeat"
          :tempo="tempo"
          :slowest="SLOWEST_BPM"
          :goal="take.target_tempo_bpm"
          :goal-label="t('sessionChord.goal', { tempo: take.target_tempo_bpm })"
          :best="take.best_clean_tempo_bpm"
          :metronome="metronome.on.value"
          :disabled="phase !== 'ready'"
          @update:metronome="toggleMetronome"
          @tempo="chooseTempo"
        />
        <div class="relative flex flex-col items-center gap-1 rounded-lg bg-surface-sunken py-4">
          <span data-test="cycles-left" class="text-4xl font-semibold tabular-nums">{{ cyclesLeft }}</span>
          <span class="text-sm text-ink-muted">{{ t('sessionChord.cyclesLeft') }}</span>
          <div
            v-if="phase === 'counting_in'"
            data-test="count-in"
            class="absolute inset-0 flex items-center justify-center rounded-lg bg-surface/80 text-4xl font-semibold tabular-nums"
            aria-live="assertive"
          >{{ countIn }}</div>
        </div>

        <template v-if="phase === 'ready'">
          <p v-if="loadError" class="text-sm text-danger" role="alert">{{ t('playAlongTake.loadError') }}</p>
          <p class="text-xs text-ink-muted">{{ t('sessionChord.readyHint') }}</p>
          <PracticeActionBar>
            <PrimaryButton data-test="start-take" data-primary-action class="h-12 w-full" @click="startTake">
              {{ t('sessionChord.start') }}
            </PrimaryButton>
          </PracticeActionBar>
        </template>
        <template v-else>
          <p data-test="running-hint" class="text-sm text-ink-muted">{{ t('sessionChord.runningHint') }}</p>
          <PracticeActionBar>
            <AppButton data-test="restart-take" variant="secondary" class="h-12 w-full" @click="restartTake">
              {{ t('sessionChord.restart') }}
            </AppButton>
          </PracticeActionBar>
        </template>
      </template>
    </template>
  </div>
</template>
