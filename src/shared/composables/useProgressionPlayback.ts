import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { audibleTime, unlockAudioContext } from '@/shared/audio/audioContext'
import { claimPlayback, releasePlayback } from '@/shared/audio/exclusivePlayback'
import { createPlaybackRun } from '@/shared/audio/playbackRun'
import type { PlaybackRun } from '@/shared/audio/playbackRun'
import { barOfPositionIds, bassLineSteps, chordSteps } from '@/shared/audio/progressionSteps'
import { fetchVoiceSamples } from '@/shared/audio/samplePrefetch'
import { secondsPerWhole } from '@/shared/audio/timeline'
import { useApi } from '@/shared/composables/useApi'
import type { PlaybackState } from '@/shared/composables/useDiagramPlayback'
import { fetchVoices } from '@/shared/composables/useListVoices'

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
/** The spread between the strings of a strum, as a pick crosses them. */
const STRUM_SECONDS = 0.018
/** How far ahead of the audio clock the first bar is placed, so it isn't already late. */
const START_DELAY_SECONDS = 0.1

/**
 * Plays a cadence or progression in a drill: the chords strummed bar by bar in their
 * instrument's voice, and on bass a line of their roots in the bass's voice, both on one clock.
 * It says which bar is sounding, so the bars can follow it. Replay is unlimited, and every Play
 * starts from the first bar. Only one thing plays at a time. It checks every voice it needs up
 * front, so a sound that can't be heard is known before the student answers.
 */
export function useProgressionPlayback(source: MaybeRefOrGetter<ProgressionSource | null>) {
  const { coreApi } = useApi()

  const state = ref<PlaybackState>('idle')
  const currentBar = ref<number | null>(null)
  const voicesReady = ref<boolean | null>(null)

  const sourceNow = computed(() => toValue(source))
  /** The tempo it plays at: the progression's own, which the student may change for this showing. */
  const tempo = ref(sourceNow.value?.tempoBpm ?? 0)

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
      const wholeSeconds = secondsPerWhole(tempo.value, FOUR_FOUR)
      runs = stepLists.map((steps, i) => createPlaybackRun(steps, { sink: sinks[i]!, wholeSeconds, loop: false, startAt }))
      state.value = 'playing'
      frame = requestAnimationFrame(tick)
    } catch {
      if (current !== attempt) return
      state.value = 'error'
      stop()
    }
  }

  // A new tempo applies from the next bar, to the chords and the bass line alike.
  watch(tempo, (bpm) => {
    const audio = context
    if (audio) runs.forEach((run) => run.setWholeSeconds(secondsPerWhole(bpm, FOUR_FOUR), audio.currentTime))
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
      const asked = ++check
      const ok = await checkVoices()
      if (asked === check) voicesReady.value = ok
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  return { state, status, currentBar, tempo, toggle, stop }
}
