<script setup lang="ts">
/**
 * One guide tone, recalled in the head: a progression plays once in a key, one chord a bar after a
 * bar of count-in, and the student taps the asked tone of each chord (its 3rd, later its 7th) on an
 * empty fretboard as the chord sounds. Each tap is timed from the first chord's downbeat by what the
 * student hears, so a take is graded bar by bar exactly as the server grades it. A tap leaves only a
 * dot where it landed; a bar's result shows once the bar has passed, never while it sounds. When the
 * take ends it is sent, and its result shows each bar hit or missed, never the notes to tap, so
 * another take in the same key is still asked. A take left in the middle is never sent.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useGuideToneChords } from '@/features/student/composables/useGuideToneChords'
import type { GuideToneTakePlayed, NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import AppButton from '@/shared/components/AppButton.vue'
import BarCell from '@/shared/components/BarCell.vue'
import type { BarPhase } from '@/shared/components/BarCell.vue'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import { useProgressionPlayback } from '@/shared/composables/useProgressionPlayback'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { CellPlace } from '@/shared/utils/fretboardCell'
import { fretWindowRange, windowBoardFrets } from '@/shared/utils/fretWindow'
import { musicKeyMessage } from '@/shared/utils/musicKey'
import { gradeTimedTaps } from '@/shared/utils/timedTaps'
import type { GradedTake, TimedTap } from '@/shared/utils/timedTaps'
import { SUGGESTED_NOTE_VALUES, speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Item = components['schemas']['PracticeSessionItem']
type GuideTone = NonNullable<Item['guide_tone']>

/** The slowest tempo a take can be chosen at. */
const SLOWEST_BPM = 30

const props = defineProps<{
  /** A guide_tone item. */
  item: Item
  /** The open-string pitches of the layout tapped on, lowest first. */
  tuning: string[]
  /** The layout's instrument, as the student calls it. */
  layoutName: string
  takesLeft: number
  takesTotal: number
}>()

const emit = defineEmits<{
  take: [take: GuideToneTakePlayed]
  next: []
  skip: [reason: NotAnsweredReason]
}>()

const { t } = useTypedT()

const planned = computed<GuideTone>(() => props.item.guide_tone!)
const chords = useGuideToneChords(() => props.item)

const tempo = ref(planned.value.tempo_bpm)
const noteValue = ref<TempoNoteValue>('quarters')
/** Whether a take clicks the beat, the count-in included. */
const metronome = ref(true)

const window = computed(() => fretWindowRange(planned.value.fret_window.from_fret))
const boardFrets = computed(() => windowBoardFrets(window.value))
const allStrings = computed(() => props.tuning.map((_, i) => i + 1))

const keyName = computed(() => t(musicKeyMessage(planned.value.music_key)))
const progressionLine = computed(() => t('guideTone.progression', { name: planned.value.progression.name, key: keyName.value }))
const prompt = computed(() => t(planned.value.tone === '7' ? 'guideTone.promptSeventh' : 'guideTone.promptThird'))

/** The take's playback: the progression once, after a bar of count-in, and on bass its roots under it. */
const source = computed<ProgressionSource | null>(() => {
  const instrument = chords.instrument.value
  if (chords.status.value !== 'ready' || !instrument) return null
  const bass = chords.bass.value
  return {
    chords: planned.value.bars.map((bar) => chords.diagrams.value[bar.chord]!),
    chordInstrument: instrument,
    bass: bass ? { instrument: bass.instrument, roots: planned.value.bars.map((bar) => rootOf(bar.chord)) } : null,
    tempoBpm: tempo.value,
    noteValue: noteValue.value,
    countInBars: 1,
  }
})
const player = useProgressionPlayback(source)
watch(metronome, (on) => (player.metronome.value = on), { immediate: true })

const phase = ref<'ready' | 'playing' | 'result'>('ready')
const taps = ref<TimedTap[]>([])
const lastTap = ref<CellPlace | null>(null)
const result = ref<GradedTake | null>(null)
const loadError = ref(false)
let leaving = false

/** The take graded as the server grades it; null when the tuning can't grade it. */
function grade(played: TimedTap[]): GradedTake | null {
  return gradeTimedTaps(
    {
      tuning: props.tuning,
      bars: planned.value.bars.map((bar) => bar.numeral),
      key: planned.value.music_key,
      tone: planned.value.tone,
      tempoBpm: tempo.value,
      noteValue: noteValue.value,
    },
    played,
  )
}

function startTake() {
  loadError.value = false
  taps.value = []
  lastTap.value = null
  result.value = null
  phase.value = 'playing'
  // Inside the tap: iOS keeps audio started any later silent.
  player.toggle()
}

function tap(place: CellPlace) {
  if (phase.value !== 'playing') return
  const at = player.musicMs()
  // The count-in sets the time; a tap before the first chord answers nothing.
  if (at === null || at < 0) return
  taps.value = [...taps.value, { at_ms: at, string: place.string, fret: place.fret }]
  lastTap.value = place
}

watch(player.state, (state, previous) => {
  if (phase.value !== 'playing' || leaving) return
  if (state === 'error') {
    loadError.value = true
    phase.value = 'ready'
  } else if (state === 'idle' && previous === 'playing') {
    endTake()
  }
})

function endTake() {
  phase.value = 'result'
  lastTap.value = null
  result.value = grade(taps.value)
  emit('take', { tempoBpm: tempo.value, noteValue: noteValue.value, taps: taps.value })
}

/** Drops the take without sending it, back to choosing its tempo. */
function restartTake() {
  phase.value = 'ready'
  player.stop()
}

function anotherTake() {
  phase.value = 'ready'
  result.value = null
}

onBeforeUnmount(() => {
  leaving = true
  player.stop()
})

/** How many of the bars already passed were hit, while the take plays; null before any has passed. */
const soFar = computed(() => {
  const sounding = player.currentBar.value
  if (phase.value !== 'playing' || sounding === null || sounding === 0) return null
  const graded = grade(taps.value)
  if (!graded) return null
  const passed = graded.bars.slice(0, sounding)
  return { hits: passed.filter((bar) => bar.hit).length, passed: passed.length }
})

const meta = computed(() => {
  const base = t('guideTone.meta', { instrument: props.layoutName, from: boardFrets.value.minFret, to: boardFrets.value.maxFret })
  return soFar.value ? `${base} · ${t('guideTone.soFar', soFar.value)}` : base
})

function barPhase(bar: number): BarPhase {
  const sounding = player.currentBar.value
  if (phase.value !== 'playing' || sounding === null) return 'upcoming'
  if (bar < sounding) return 'played'
  return bar === sounding ? 'current' : 'upcoming'
}

const hits = computed(() => result.value?.bars.filter((bar) => bar.hit).length ?? 0)
const canTakeAgain = computed(() => phase.value === 'result' && !result.value?.correct && props.takesLeft > 0)

const goalMark = computed(() => Math.floor(planned.value.target_tempo_bpm / speedFactor(noteValue.value)))

function rootOf(symbol: string): string {
  return /^[A-G][#b]?/.exec(symbol)?.[0] ?? symbol
}
</script>

<template>
  <div class="flex flex-col gap-4" data-test="guide-tone">
    <LoadingSkeleton v-if="chords.status.value === 'loading'" />

    <template v-else-if="chords.status.value === 'unavailable'">
      <InlineNotice tone="unavailable" :message="t('guideTone.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('playAlongTake.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else>
      <ItemHeader :title="prompt" :reason="item.reason" />

      <section class="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3">
        <p data-test="guide-tone-progression" class="text-base font-semibold text-ink">{{ progressionLine }}</p>
        <ol :aria-label="t('drill.player.bars')" class="grid grid-cols-4 gap-1.5">
          <BarCell v-for="(bar, i) in planned.bars" :key="i" data-test="guide-tone-bar" :label="bar.chord" :position="i + 1" :phase="barPhase(i)" />
        </ol>
      </section>

      <p data-test="guide-tone-meta" class="text-sm text-ink-muted" aria-live="polite">{{ meta }}</p>

      <DrillFretboard
        :tuning="tuning"
        :max-fret="boardFrets.maxFret"
        :fret-window="window"
        :label="t('guideTone.board', { from: boardFrets.minFret, to: boardFrets.maxFret })"
        :tap-strings="allStrings"
        :lit="lastTap"
        :locked="phase !== 'playing'"
        @tap="tap"
      />

      <template v-if="phase === 'ready'">
        <TempoControl
          :tempo="tempo"
          :slowest="SLOWEST_BPM"
          :goal="goalMark"
          :best="null"
          :metronome="metronome"
          :disabled="false"
          :note-value="noteValue"
          :note-values="SUGGESTED_NOTE_VALUES"
          @update:metronome="metronome = $event"
          @update:note-value="noteValue = $event"
          @tempo="tempo = $event"
        />
        <p v-if="loadError" class="text-sm text-danger" role="alert">{{ t('playAlongTake.loadError') }}</p>
        <p class="text-xs text-ink-muted">{{ t(planned.tone === '7' ? 'guideTone.countInSeventh' : 'guideTone.countInThird') }}</p>
        <PracticeActionBar>
          <PrimaryButton data-test="start-take" data-primary-action class="h-12 w-full" :disabled="!source" @click="startTake">
            {{ t('guideTone.start') }}
          </PrimaryButton>
        </PracticeActionBar>
      </template>

      <template v-else-if="phase === 'playing'">
        <p class="text-sm text-ink-muted">{{ player.currentBar.value === null ? t('guideTone.countingIn') : t('guideTone.tapping') }}</p>
        <PracticeActionBar>
          <AppButton data-test="restart-take" variant="secondary" class="h-12 w-full" @click="restartTake">
            {{ t('playAlongTake.restart') }}
          </AppButton>
        </PracticeActionBar>
      </template>

      <template v-else>
        <section data-test="guide-tone-results" class="flex flex-col gap-2">
          <h3 class="text-base font-semibold">
            {{ result?.correct ? t('guideTone.allInTime') : t('guideTone.someInTime', { hits, total: planned.bars.length }) }}
          </h3>
          <ol class="grid grid-cols-4 gap-1.5">
            <li
              v-for="(bar, i) in result?.bars ?? []"
              :key="i"
              data-test="guide-tone-result"
              :data-hit="bar.hit"
              class="flex items-center gap-1 rounded-md border border-border px-2 py-2 text-sm font-semibold"
            >
              <CircleCheck v-if="bar.hit" :size="16" class="text-success" aria-hidden="true" />
              <CircleX v-else :size="16" class="text-danger" aria-hidden="true" />
              <span>{{ planned.bars[i]?.chord }}</span>
              <span class="sr-only">{{ bar.hit ? t('guideTone.hit') : t('guideTone.missed') }}</span>
            </li>
          </ol>
        </section>
        <PracticeActionBar>
          <template v-if="canTakeAgain">
            <AppButton data-test="next-item" variant="tertiary" class="h-12 px-4" @click="emit('next')">{{ t('guideTone.moveOn') }}</AppButton>
            <PrimaryButton data-test="another-take" data-primary-action class="h-12 flex-1" @click="anotherTake">{{ t('guideTone.anotherTake') }}</PrimaryButton>
          </template>
          <PrimaryButton v-else data-test="next-item" data-primary-action class="h-12 w-full" @click="emit('next')">{{ t('guideTone.next') }}</PrimaryButton>
        </PracticeActionBar>
      </template>
    </template>
  </div>
</template>
