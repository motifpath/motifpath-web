import { onScopeDispose } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { unlockAudioContext } from '@/shared/audio/audioContext'
import { claimPlayback, releasePlayback } from '@/shared/audio/exclusivePlayback'
import { createPlaybackRun } from '@/shared/audio/playbackRun'
import type { PlaybackRun } from '@/shared/audio/playbackRun'
import { bassLineSteps, chordSteps } from '@/shared/audio/progressionSteps'
import type { PlaybackStep } from '@/shared/audio/timeline'
import { secondsPerWhole } from '@/shared/audio/timeline'
import { useApi } from '@/shared/composables/useApi'
import { fetchVoices } from '@/shared/composables/useListVoices'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type TimeSignature = components['schemas']['TimeSignature']

/** A tapped chord rings for a bar of 4/4 at this tempo; a root for half of it. */
const RING_BPM = 90
const FOUR_FOUR: TimeSignature = { beats: 4, beat_value: 4 }
const ROOT_VALUE = 1 / 2
/** The spread between the strings of a strum, as a pick crosses them. */
const STRUM_SECONDS = 0.018
/** How far ahead of the audio clock the first note is placed, so it isn't already late. */
const START_DELAY_SECONDS = 0.05

/**
 * Sounds a chord when it's tapped: a voicing strummed in its instrument's voice, or on bass the
 * chord's root, once, in the bass's voice. Only one thing plays at a time, so a tap stops what was
 * sounding; so does its screen going. A sound that can't be had stays silent.
 */
export function useChordSound() {
  const { coreApi } = useApi()
  let run: PlaybackRun | null = null
  // Bumped by every play and stop, so a load that finishes after either is dropped.
  let attempt = 0

  function stop() {
    attempt++
    run?.stop()
    run = null
    releasePlayback(stop)
  }

  async function play(steps: PlaybackStep[], instrument: Instrument) {
    claimPlayback(stop)
    const current = ++attempt
    // Created and resumed inside the tap, before anything is awaited, or iOS keeps it silent.
    const audio = unlockAudioContext()
    try {
      const [{ loadVoiceSampler }, voices] = await Promise.all([import('@/shared/audio/voiceSampler'), fetchVoices(coreApi)])
      const voice = voices.data?.find((v) => v.voice_id === instrument.default_voice_id)
      if (!voice) return
      const sink = await loadVoiceSampler(audio, voice)
      if (current !== attempt) return
      run = createPlaybackRun(steps, {
        sink,
        wholeSeconds: secondsPerWhole(RING_BPM, FOUR_FOUR),
        loop: false,
        startAt: audio.currentTime + START_DELAY_SECONDS,
      })
    } catch {
      // Left silent: tapping is a help to hear the chord, never needed to play the song.
    }
  }

  /** Strums a voicing's diagram on its instrument. */
  function strum(diagram: Diagram, instrument: Instrument) {
    void play(chordSteps([diagram], instrument.tuning ?? [], STRUM_SECONDS), instrument)
  }

  /** Plays a chord's root once, at the bottom of the bass. */
  function playRoot(root: string, bass: Instrument) {
    const [beat] = bassLineSteps([root], bass.tuning ?? [])
    if (beat) void play([{ ...beat, value: ROOT_VALUE }], bass)
  }

  onScopeDispose(stop)

  return { strum, playRoot }
}
