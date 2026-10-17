import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { audibleTime, unlockAudioContext } from '@/shared/audio/audioContext'
import { createClickSink } from '@/shared/audio/clickSink'
import { claimPlayback, releasePlayback } from '@/shared/audio/exclusivePlayback'
import { createPlaybackRun } from '@/shared/audio/playbackRun'
import type { PlaybackRun } from '@/shared/audio/playbackRun'
import { barOfPositionIds, bassLineSteps, chordSteps } from '@/shared/audio/progressionSteps'
import { fetchVoiceSamples } from '@/shared/audio/samplePrefetch'
import { secondsPerWhole } from '@/shared/audio/timeline'
import { useApi } from '@/shared/composables/useApi'
import type { PlaybackState } from '@/shared/composables/useDiagramPlayback'
import { fetchVoices } from '@/shared/composables/useListVoices'
import { speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type TimeSignature = components['schemas']['TimeSignature']

/** What a cadence or progression plays: one chord voicing a bar, and on bass a line of roots. */
export interface ProgressionSource {
  /** Each bar's voicing, in order, played in the chord instrument's voice. */
  chords: Diagram[]
  chordInstrument: Instrument
  /** The bass line under the chords, in the bass's own voice; null for none. */
  bass: { instrument: Instrument; roots: string[] } | null
  tempoBpm: number
}

export type ProgressionSoundStatus = 'loading' | 'ready' | 'missing'

const FOUR_FOUR: TimeSignature = { beats: 4, beat_value: 4 }
/** A quarter: the beat of a progression's 4/4 bars, as a fraction of a whole note. */
const BEAT = 1 / 4
/** The spread between the strings of a strum, as a pick crosses them. */
const STRUM_SECONDS = 0.018
/** Just before a bar's end, so the beats of the bass that start within the bar are kept as they are. */
const BAR_END_SLACK_SECONDS = 1e-6
/** How far ahead of the audio clock the first bar is placed, so it isn't already late. */
const START_DELAY_SECONDS = 0.1

/**
 * Plays a cadence or progression in a drill: the chords strummed bar by bar in their
 * instrument's voice, and on bass a line of their roots in the bass's voice, both on one clock.
 * It says which bar is sounding, so the bars can follow it. Replay is unlimited, and every Play
 * starts from the first bar. Only one thing plays at a time. It checks every voice it needs up
 * front, so a sound that can't be heard is known before the student answers.
 *
 * The student may change its tempo and its note value for this showing: in eighths the
 * progression plays twice as fast, two chords a bar, while the metronome, when it's on, clicks
 * the beat at the tempo.
 */
export function useProgressionPlayback(source: MaybeRefOrGetter<ProgressionSource | null>) {
  const { coreApi } = useApi()

  const state = ref<PlaybackState>('idle')
  const currentBar = ref<number | null>(null)
  const voicesReady = ref<boolean | null>(null)

  const sourceNow = computed(() => toValue(source))
  /** The tempo it plays at: the progression's own, which the student may change for this showing. */
  const tempo = ref(sourceNow.value?.tempoBpm ?? 0)
  const noteValue = ref<TempoNoteValue>('quarters')
  /** Whether Play clicks the beat under the progression. */
  const metronome = ref(false)

  /** How long a written whole note lasts, and how far apart the clicks fall in written notes. */
  function timing() {
    const factor = speedFactor(noteValue.value)
    return { wholeSeconds: secondsPerWhole(tempo.value, FOUR_FOUR) / factor, clickBeat: BEAT * factor }
  }

  /** How long one play lasts at the tempo and note value it plays at now: a whole note a bar. */
  const lengthMs = computed(() => Math.round((sourceNow.value?.chords.length ?? 0) * timing().wholeSeconds * 1000))

  /** Each voice the progression plays in, the chords' first. */
  const voiceIds = computed(() => {
    const now = sourceNow.value
    if (!now) return []
    return [now.chordInstrument.default_voice_id, ...(now.bass ? [now.bass.instrument.default_voice_id] : [])].filter(
      (id): id is string => id !== undefined,
    )
  })

  async function findVoice(voiceId: string) {
    const voices = await fetchVoices(coreApi)
    const voice = voices.data?.find((v) => v.voice_id === voiceId)
    if (!voice) throw new Error(`voice ${voiceId} unavailable`)
    return voice
  }

  async function checkVoices(): Promise<boolean> {
    try {
      const voices = await Promise.all(voiceIds.value.map(findVoice))
      const fetched = await Promise.all(voices.map(fetchVoiceSamples))
      return fetched.every(Boolean)
    } catch {
      return false
    }
  }

  const status = computed<ProgressionSoundStatus>(() => {
    if (state.value === 'error' || voicesReady.value === false) return 'missing'
    return voicesReady.value ? 'ready' : 'loading'
  })

  let runs: PlaybackRun[] = []
  let context: AudioContext | null = null
  let frame = 0
  // Bumped by every Play and Stop, so a load that finishes after either is dropped.
  let attempt = 0
  // Bumped by every new progression, so a check of the voices of an old one is dropped.
  let check = 0

  function stop() {
    attempt++
    cancelAnimationFrame(frame)
    runs.forEach((run) => run.stop())
    runs = []
    currentBar.value = null
    if (state.value !== 'error') state.value = 'idle'
    releasePlayback(stop)
  }

  function tick() {
    const [chords] = runs
    if (!chords || !context) return
    const heard = audibleTime(context)
    if (runs.every((run) => run.finished(heard))) {
      stop()
      return
    }
    const bar = barOfPositionIds(chords.activePositionIds(heard))
    if (bar !== currentBar.value) currentBar.value = bar
    frame = requestAnimationFrame(tick)
  }

  async function play() {
    const now = sourceNow.value
    if (!now) return
    claimPlayback(stop)
    const current = ++attempt
    // Created and resumed inside the click, before anything is awaited, or iOS keeps it silent.
    const audio = unlockAudioContext()
    context = audio
    state.value = 'loading'
    try {
      const { loadVoiceSampler } = await import('@/shared/audio/voiceSampler')
      const voices = await Promise.all(voiceIds.value.map(findVoice))
      const sinks = await Promise.all(voices.map((voice) => loadVoiceSampler(audio, voice)))
      if (current !== attempt) return
      const stepLists = [chordSteps(now.chords, now.chordInstrument.tuning ?? [], STRUM_SECONDS)]
      if (now.bass) stepLists.push(bassLineSteps(now.bass.roots, now.bass.instrument.tuning ?? []))
      const startAt = audio.currentTime + START_DELAY_SECONDS
      const { wholeSeconds, clickBeat } = timing()
      const click = metronome.value ? { sink: createClickSink(audio), beat: clickBeat, beatsPerBar: FOUR_FOUR.beats } : undefined
      // The click goes with the chords only, so it sounds once whatever plays under them.
      runs = stepLists.map((steps, i) =>
        createPlaybackRun(steps, { sink: sinks[i]!, wholeSeconds, loop: false, startAt, metronome: i === 0 ? click : undefined }),
      )
      state.value = 'playing'
      frame = requestAnimationFrame(tick)
    } catch {
      if (current !== attempt) return
      state.value = 'error'
      stop()
    }
  }

  // A new tempo or note value applies from the next bar, to the chords and the bass line alike:
  // the bass keeps the beats left in the sounding bar, so it never runs ahead of the chords.
  watch([tempo, noteValue], () => {
    const audio = context
    const [chords, ...under] = runs
    if (!audio || !chords) return
    const { wholeSeconds, clickBeat } = timing()
    const now = audio.currentTime
    const barEnd = chords.stepEndAt(now)
    chords.setWholeSeconds(wholeSeconds, now, clickBeat)
    under.forEach((run) => run.setWholeSeconds(wholeSeconds, barEnd === null ? now : barEnd - BAR_END_SLACK_SECONDS))
  })

  function toggle() {
    if (state.value === 'playing' || state.value === 'loading') {
      stop()
    } else {
      state.value = 'idle'
      void play()
    }
  }

  // Another progression starts over, and its voices are checked again.
  watch(
    () => JSON.stringify(sourceNow.value),
    async () => {
      stop()
      state.value = 'idle'
      voicesReady.value = null
      if (!sourceNow.value) return
      tempo.value = sourceNow.value.tempoBpm
      noteValue.value = 'quarters'
      const asked = ++check
      const ok = await checkVoices()
      if (asked === check) voicesReady.value = ok
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  return { state, status, currentBar, tempo, noteValue, metronome, lengthMs, toggle, stop }
}
