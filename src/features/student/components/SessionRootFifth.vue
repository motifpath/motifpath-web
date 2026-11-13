<script setup lang="ts">
/**
 * A chord's root and fifth on bass, played as a take under the metronome: the board marks the
 * root, the fifth above it and the fifth below it in the plan's five-fret window, the chord named.
 *
 * Ready: the metronome row starts at the plan's tempo, which the student may change. Starting the
 * take gives a bar of count-in, then the bass's own voice plays the root then the fifth above, a
 * half note each, for a few bars, and never a chord: the student plays along. The take ends by
 * itself or when stopped early, and is rated; the rating goes with the tempo it was played at.
 * Restart drops it unrated. Without the bass, the item can only be skipped.
 */
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import SelfRating from '@/features/student/components/SelfRating.vue'
import { bassWindow, boardFretsFor } from '@/features/student/utils/chordPlaces'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import AppButton from '@/shared/components/AppButton.vue'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { MarkedPlace } from '@/shared/components/diagram/DrillFretboard.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import MetronomeRow from '@/shared/components/MetronomeRow.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeBreakout from '@/shared/components/PracticeBreakout.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useProgressionPlayback } from '@/shared/composables/useProgressionPlayback'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import { frettedPitch } from '@/shared/utils/pitch'
import { MAX_TEMPO_BPM, MIN_TEMPO_BPM } from '@/shared/utils/sequence'

type Item = components['schemas']['PracticeSessionItem']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  /** A root_fifth item. */
  item: Item
  /** The bass the item is on: its tuning draws the board, its voice plays the take. */
  bass?: Instrument
  /** The instrument the item is on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ rate: [rating: TakeRating, tempoBpm: number]; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()

/** The bars a take plays after its count-in, the root and the fifth in each. */
const TAKE_BARS = 4
/** Beats in a bar, a dot each. */
const BEATS = 4

const planned = computed(() => props.item.root_fifth!)
const chord = computed(() => planned.value.chord_symbol)
const tuning = computed(() => props.bass?.tuning ?? null)

const places = computed<MarkedPlace[]>(() => [
  { ...planned.value.root, role: 'root' },
  { ...planned.value.fifth, role: 'fifth', position: 'above' },
  ...(planned.value.fifth_below ? [{ ...planned.value.fifth_below, role: 'fifth' as const, position: 'below' as const }] : []),
])
const window = computed(() => bassWindow(planned.value.window_start_fret))
const maxFret = computed(() => Math.max(boardFretsFor(places.value), window.value.to))

const tempo = ref(clampTempo(planned.value.start_tempo_bpm))

function clampTempo(bpm: number): number {
  return Math.min(MAX_TEMPO_BPM, Math.max(MIN_TEMPO_BPM, Math.round(bpm)))
}

/** The take: the root then the fifth above, a half note each, bar after bar, in the bass's voice only. */
const source = computed<ProgressionSource | null>(() => {
  const bass = props.bass
  if (!bass || !tuning.value) return null
  const root = frettedPitch(tuning.value, planned.value.root.string, planned.value.root.fret)
  const fifth = frettedPitch(tuning.value, planned.value.fifth.string, planned.value.fifth.fret)
  if (root === null || fifth === null) return null
  return {
    chords: [],
    chordInstrument: null,
    bass: { instrument: bass, bars: Array.from({ length: TAKE_BARS }, () => [root, fifth]) },
    tempoBpm: tempo.value,
    countInBars: 1,
  }
})
const player = useProgressionPlayback(source)
/** Whether a take clicks the beat, the count-in included. */
const metronome = ref(true)
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

/** Drops the take without a rating, back to choosing its tempo. */
function restartTake() {
  phase.value = 'ready'
  player.stop()
}

function chooseTempo(bpm: number) {
  if (phase.value === 'ready') tempo.value = clampTempo(bpm)
}

function rate(rating: TakeRating) {
  emit('rate', rating, tempo.value)
}
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-root-fifth">
    <template v-if="!tuning">
      <InlineNotice tone="unavailable" :message="t('sessionChord.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('sessionChord.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else>
      <p v-if="instrumentName" data-test="item-instrument" class="-mb-2 text-sm font-medium text-ink-muted">{{ instrumentName }}</p>
      <ItemHeader :title="t('sessionPlan.chords.rootFifth', { chord })" :reason="item.reason" />
      <p data-test="chord-hint" class="text-ink-muted">{{ t('sessionChord.rootFifthHint') }}</p>

      <PracticeBreakout>
        <DrillFretboard :tuning="tuning" :max-fret="maxFret" :fret-window="window" :label="t('sessionChord.bassBoard', { chord })" :places="places" locked />
      </PracticeBreakout>

      <MetronomeRow
        :beats="BEATS"
        :lit="player.beat.value"
        :tempo="tempo"
        :slowest="MIN_TEMPO_BPM"
        :goal="null"
        :best="null"
        :metronome="metronome"
        :disabled="phase !== 'ready'"
        @update:metronome="metronome = $event"
        @tempo="chooseTempo"
      />

      <template v-if="phase === 'ready'">
        <p v-if="loadError" class="text-sm text-danger" role="alert">{{ t('playAlongTake.loadError') }}</p>
        <PracticeActionBar>
          <PrimaryButton data-test="start-take" data-primary-action class="h-12 w-full" :disabled="!source" @click="startTake">
            {{ t('sessionChord.start') }}
          </PrimaryButton>
        </PracticeActionBar>
      </template>

      <template v-else-if="phase === 'playing'">
        <p class="text-sm text-ink-muted">{{ player.currentBar.value === null ? t('progressionKeys.countingIn') : t('sessionChord.rootFifthPlaying') }}</p>
        <PracticeActionBar>
          <AppButton data-test="restart-take" variant="tertiary" class="h-12 px-4" @click="restartTake">
            {{ t('playAlongTake.restart') }}
          </AppButton>
          <AppButton data-test="stop-early" variant="secondary" class="h-12 flex-1" @click="stopEarly">
            {{ t('playAlongTake.stopEarly') }}
          </AppButton>
        </PracticeActionBar>
      </template>

      <SelfRating v-else :bpm="tempo" @rate="rate" @restart="restartTake" />
    </template>
  </div>
</template>
