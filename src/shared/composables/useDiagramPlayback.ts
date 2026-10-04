import { computed, onScopeDispose, ref, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { audibleTime, unlockAudioContext } from '@/shared/audio/audioContext'
import { createClickSink } from '@/shared/audio/clickSink'
import { createPlaybackRun } from '@/shared/audio/playbackRun'
import type { PlaybackRun } from '@/shared/audio/playbackRun'
import { playbackSteps, secondsPerWhole } from '@/shared/audio/timeline'
import { beatsPerBar, pulse } from '@/shared/utils/sequence'
import { useApi } from '@/shared/composables/useApi'
import { fetchVoices } from '@/shared/composables/useListVoices'
import { frettedPitch } from '@/shared/utils/pitch'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type Playback = NonNullable<components['schemas']['DiagramRef']['playback']>

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'error'

export interface PlaybackSource {
  diagram: Diagram
  instrument: Instrument
  /** How this usage plays the diagram; null when it offers no Play control. */
  playback: Playback | null
}

const FALLBACK_TEMPO_BPM = 90
/** The spread between the strings of a strummed step, as a pick crosses them. */
const STRUM_SECONDS = 0.018
/** How far ahead of the audio clock the first note is placed, so it isn't already late. */
const START_DELAY_SECONDS = 0.1

// Only one diagram plays at a time: starting one stops whichever was playing.
let stopPlaying: (() => void) | null = null

// Recordings never change at their URL, so one fetch a page puts each in the HTTP cache.
const prefetched = new Set<string>()

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/** Forgets which recordings were prefetched. For tests. */
export function clearPrefetchedSamples() {
  prefetched.clear()
}

/** Each position's sounding pitch; null where the tuning doesn't give one. */
function positionPitches({ diagram, instrument }: PlaybackSource): Map<string | undefined, number | null> {
  const tuning = instrument.tuning ?? []
  return new Map(diagram.positions.map((p) => [p.position_id, frettedPitch(tuning, p.string ?? 0, p.fret ?? 0)]))
}

/**
 * Whether a usage offers Play for a diagram: a fretted diagram whose usage enables playback and
 * whose sequence has a step that sounds, so a sequence of rests never plays silence.
 */
export function isPlayable(source: PlaybackSource): boolean {
  if (source.playback === null || source.instrument.family !== 'fretted') return false
  const pitches = positionPitches(source)
  return source.diagram.sequence.some((step) => step.position_ids.some((id) => (pitches.get(id) ?? null) !== null))
}

/**
 * Plays a diagram's sequence and says which positions are sounding, so the
 * view can light them up. Every note is scheduled on the audio clock up
 * front; an animation-frame loop reads what is audible right now (output
 * latency included) rather than trusting timers or note callbacks.
 *
 * The voice is the usage's, else the instrument's default; the tempo the
 * student's (`tempo`, never saved), which starts at the usage's, else the
 * diagram's. A new tempo applies from the next step. Positions a usage hides
 * still sound. Playing stops when the owning component goes away. With
 * `metronome`, a click sounds on every beat of the run, the first of each bar
 * accented, read when Play is pressed.
 */
export function useDiagramPlayback(
  source: MaybeRefOrGetter<PlaybackSource>,
  options: { metronome?: MaybeRefOrGetter<boolean> } = {},
) {
  const { coreApi } = useApi()

  const state = ref<PlaybackState>('idle')
  const activePositionIds = shallowRef<string[]>([])

  const effectiveTempo = computed(() => {
    const { diagram, playback } = toValue(source)
    return playback?.tempo_bpm ?? diagram.tempo_bpm ?? FALLBACK_TEMPO_BPM
  })
  const tempo = ref(effectiveTempo.value)

  const pitches = computed(() => positionPitches(toValue(source)))
  const pitchOf = (positionId: string) => pitches.value.get(positionId) ?? null

  const canPlay = computed(() => isPlayable(toValue(source)))

  const voiceId = computed(() => {
    const { instrument, playback } = toValue(source)
    return playback?.voice_id ?? instrument.default_voice_id
  })

  async function findVoice() {
    const voices = await fetchVoices(coreApi)
    const voice = voices.data?.find((v) => v.voice_id === voiceId.value)
    if (!voice) throw new Error(`voice ${voiceId.value} unavailable`)
    return voice
  }

  /** Fetches the voice's recordings ahead of Play, such as when the player scrolls into view. */
  async function prefetch() {
    if (!canPlay.value) return
    try {
      const voice = await findVoice()
      const urls = voice.samples.map((sample) => sample.url).filter((url) => !prefetched.has(url))
      urls.forEach((url) => prefetched.add(url))
      await Promise.all(urls.map((url) => fetch(url).catch(() => prefetched.delete(url))))
    } catch {
      // Play loads what's missing.
    }
  }

  let run: PlaybackRun | null = null
  let context: AudioContext | null = null
  let frame = 0
  // Bumped by every Play and Stop, so a load that finishes after either is dropped.
  let attempt = 0

  function stop() {
    attempt++
    cancelAnimationFrame(frame)
    run?.stop()
    run = null
    activePositionIds.value = []
    if (state.value !== 'error') state.value = 'idle'
    if (stopPlaying === stop) stopPlaying = null
  }

  function tick() {
    if (!run || !context) return
    const heard = audibleTime(context)
    run.update(context.currentTime)
    if (run.finished(heard)) {
      stop()
      return
    }
    // Assigned only when the lit positions change: every assignment re-renders the diagram (and
    // whatever holds it), and a step lasts many frames.
    const heardIds = run.activePositionIds(heard)
    if (!sameIds(heardIds, activePositionIds.value)) activePositionIds.value = heardIds
    frame = requestAnimationFrame(tick)
  }

  async function play() {
    stopPlaying?.()
    stopPlaying = stop
    const current = ++attempt
    // Created and resumed inside the click, before anything is awaited, or iOS keeps it silent.
    const audio = unlockAudioContext()
    context = audio
    state.value = 'loading'

    const { diagram, playback } = toValue(source)
    try {
      const [{ loadVoiceSampler }, voice] = await Promise.all([import('@/shared/audio/voiceSampler'), findVoice()])
      const sink = await loadVoiceSampler(audio, voice)
      if (current !== attempt) return
      const beat = pulse(diagram.time_signature)
      const metronome = toValue(options.metronome)
        ? { sink: createClickSink(audio), beat: beat.num / beat.den, beatsPerBar: beatsPerBar(diagram.time_signature) }
        : undefined

      const steps = playbackSteps(diagram.sequence, pitchOf, {
        direction: playback?.direction ?? 'as_authored',
        strumSeconds: STRUM_SECONDS,
      })
      run = createPlaybackRun(steps, {
        sink,
        wholeSeconds: secondsPerWhole(tempo.value, diagram.time_signature),
        loop: playback?.loop ?? false,
        startAt: audio.currentTime + START_DELAY_SECONDS,
        metronome,
      })
      state.value = 'playing'
      frame = requestAnimationFrame(tick)
    } catch {
      if (current !== attempt) return
      state.value = 'error'
      stop()
    }
  }

  function toggle() {
    if (state.value === 'playing' || state.value === 'loading') {
      stop()
    } else {
      state.value = 'idle'
      void play()
    }
  }

  watch(tempo, (bpm) => {
    if (run && context) run.setWholeSeconds(secondsPerWhole(bpm, toValue(source).diagram.time_signature), context.currentTime)
  })

  // Another diagram, or another way of playing it, starts over at its own tempo.
  watch(
    () => JSON.stringify([toValue(source).diagram, toValue(source).playback]),
    () => {
      stop()
      state.value = 'idle'
      tempo.value = effectiveTempo.value
    },
  )

  onScopeDispose(stop)

  return { canPlay, state, activePositionIds, tempo, toggle, stop, prefetch }
}
