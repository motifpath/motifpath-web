<script setup lang="ts">
/**
 * A minute of changes between two chords, back and forth, one change on every beat: on guitar
 * both chord boxes, on bass both roots marked on the board, every chord named.
 *
 * Ready: the tempo starts at the plan's, and the student may set another, the metronome ticking
 * while they try it. Starting the minute gives a bar of count-in, then 60 seconds with the
 * metronome ticking and nothing to tap, both hands being on the instrument: only leaving the
 * session ends it early, and then nothing is sent. When the minute is up the metronome stops and
 * the student counts the changes that rang clean, from the item's last count (never more than the
 * minute had beats); saving sends the tempo played and the count. A chord that can't be drawn
 * here can only be skipped, as not answered.
 */
import { computed, onBeforeUnmount, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import { useChordBoxes } from '@/features/student/composables/useChordBoxes'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import { boardFretsFor } from '@/features/student/utils/chordPlaces'
import ChangeTimer from '@/shared/components/ChangeTimer.vue'
import CountStepper from '@/shared/components/CountStepper.vue'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { MarkedPlace } from '@/shared/components/diagram/DrillFretboard.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeBreakout from '@/shared/components/PracticeBreakout.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import { useMetronome } from '@/shared/composables/useMetronome'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MAX_TEMPO_BPM } from '@/shared/utils/sequence'

type Item = components['schemas']['PracticeSessionItem']

const props = defineProps<{
  /** A chord_change item, or a root_change item on bass. */
  item: Item
  /** The open-string pitches of a bass item's layout, lowest first. */
  tuning?: string[]
  /** The instrument the item is on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ save: [tempoBpm: number, cleanChanges: number]; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()

/** The minute, and the bar of count-in before it: one bar of 4/4, a change on every beat. */
const MINUTE_MS = 60_000
const COUNT_IN_BEATS = 4
/** The slowest tempo a minute is played at, as the ladder never goes below it. */
const SLOWEST_BPM = 20
/** How often the countdown is read while it runs. */
const TICK_MS = 100

const change = computed(() => props.item.chord_change ?? props.item.root_change!)
const onBass = computed(() => props.item.root_change !== undefined)
const minute = computed(() => change.value.minute)
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

const status = computed(() => {
  if (onBass.value) return props.tuning ? 'ready' : 'unavailable'
  return chords.status.value
})

const tempo = ref(clampTempo(minute.value.start_tempo_bpm))

function clampTempo(bpm: number): number {
  return Math.min(MAX_TEMPO_BPM, Math.max(SLOWEST_BPM, Math.round(bpm)))
}

const metronome = useMetronome(() => ({ bpm: tempo.value, beats: COUNT_IN_BEATS, beatValue: 4, noteValue: 'quarters' }))

const phase = ref<'ready' | 'counting_in' | 'running' | 'count'>('ready')
/** Count-in beats still to come. */
const countIn = ref(0)
const remainingMs = ref(MINUTE_MS)
/** The clean changes the student counts once the minute is up. */
const count = ref(0)

let timer: ReturnType<typeof setInterval> | undefined
let startedAt = 0

function stopTimer() {
  clearInterval(timer)
  timer = undefined
}

/** Reads the clock: the count-in beat, then the time left, until the minute is up. */
function tick() {
  const elapsed = Date.now() - startedAt
  const countInMs = (COUNT_IN_BEATS * 60_000) / tempo.value
  if (elapsed < countInMs) {
    countIn.value = COUNT_IN_BEATS - Math.floor(elapsed / (60_000 / tempo.value))
    return
  }
  phase.value = 'running'
  countIn.value = 0
  remainingMs.value = Math.max(0, MINUTE_MS - (elapsed - countInMs))
  if (remainingMs.value === 0) timeUp()
}

function startMinute() {
  // Inside the tap: browsers only let audio start from one.
  metronome.start()
  phase.value = 'counting_in'
  countIn.value = COUNT_IN_BEATS
  remainingMs.value = MINUTE_MS
  startedAt = Date.now()
  stopTimer()
  timer = setInterval(tick, TICK_MS)
}

function timeUp() {
  stopTimer()
  metronome.stop()
  count.value = Math.min(minute.value.last_changes_per_minute ?? 0, tempo.value)
  phase.value = 'count'
}

function chooseTempo(bpm: number) {
  if (phase.value === 'ready') tempo.value = clampTempo(bpm)
}

function toggleMetronome() {
  if (phase.value === 'ready') metronome.toggle()
}

function save() {
  if (phase.value === 'count') emit('save', tempo.value, count.value)
}

onBeforeUnmount(stopTimer)

const best = computed(() => minute.value.best_clean_changes_per_minute)

/** Above the chords: what to do, then once the minute is up what to count. */
const meta = computed(() => {
  if (phase.value === 'count') return onBass.value ? t('sessionChord.timeUpBass') : t('sessionChord.timeUp')
  const everyBeat = t('sessionChord.everyBeat')
  return best.value === null ? everyBeat : `${everyBeat} · ${t('sessionChord.best', { count: best.value })}`
})

const countLabel = computed(() =>
  best.value === null ? t('sessionChord.cleanChanges') : t('sessionChord.cleanChangesBest', { count: best.value }),
)
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
        <DrillFretboard :tuning="tuning" :max-fret="boardFretsFor(roots)" :label="t('sessionChord.bassChangeBoard', pair)" :places="roots" />
      </PracticeBreakout>
      <div v-else-if="chords.instrument.value" class="flex justify-center gap-6">
        <div v-for="box in boxes" :key="box.diagram.diagram_id" data-test="pair-chord" class="flex flex-col items-center gap-1">
          <span data-test="pair-chord-name" class="text-lg font-semibold">{{ box.symbol }}</span>
          <ChordBox :voicing="box.voicing" :diagram="box.diagram" :instrument="chords.instrument.value" :label="box.symbol" />
        </div>
      </div>

      <template v-if="phase === 'count'">
        <CountStepper v-model="count" :label="countLabel" :max="tempo" />
        <PracticeActionBar>
          <PrimaryButton data-test="save-count" data-primary-action class="h-12 w-full" @click="save">
            {{ t('sessionChord.save', { count }) }}
          </PrimaryButton>
        </PracticeActionBar>
      </template>

      <template v-else>
        <TempoControl
          :tempo="tempo"
          :slowest="SLOWEST_BPM"
          :goal="minute.target_changes_per_minute"
          :goal-label="t('sessionChord.goal', { count: minute.target_changes_per_minute })"
          :best="best"
          :metronome="metronome.on.value"
          :disabled="phase !== 'ready'"
          @update:metronome="toggleMetronome"
          @tempo="chooseTempo"
        />
        <div class="relative">
          <ChangeTimer :remaining-ms="remainingMs" :total-ms="MINUTE_MS" :running="phase === 'running'" :detail="t('sessionChord.everyBeatDetail')" />
          <div
            v-if="phase === 'counting_in'"
            data-test="count-in"
            class="absolute inset-0 flex items-center justify-center rounded-lg bg-surface/80 text-4xl font-semibold tabular-nums"
            aria-live="assertive"
          >{{ countIn }}</div>
        </div>

        <template v-if="phase === 'ready'">
          <p class="text-xs text-ink-muted">{{ t('sessionChord.readyHint') }}</p>
          <PracticeActionBar>
            <PrimaryButton data-test="start-minute" data-primary-action class="h-12 w-full" @click="startMinute">
              {{ t('sessionChord.start') }}
            </PrimaryButton>
          </PracticeActionBar>
        </template>
        <p v-else data-test="running-hint" class="text-sm text-ink-muted">{{ t('sessionChord.runningHint') }}</p>
      </template>
    </template>
  </div>
</template>
