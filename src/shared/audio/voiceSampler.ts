/**
 * The only module that touches smplr, which is pinned to exactly 1.0.1: it
 * turns a Voice's recordings into a `NoteSink` and works around the traps
 * that make that version silently misbehave:
 *
 * - buffers keyed by MIDI number, or no explicit `detune`, play nothing;
 * - a note given a duration but no `ampRelease` throws a non-finite ramp;
 * - a note's stop function stops every voice sharing its `stopId`, which
 *   defaults to the note, so each note gets an id of its own;
 * - notes more than 200 ms ahead wait on a timer a background tab throttles,
 *   so every note goes to the audio clock as soon as it is played.
 *
 * `voiceSampler.offline.spec.ts` renders a real note to catch a regression
 * when smplr is bumped.
 */
import { Sampler, Scheduler } from 'smplr'

import type { components } from '@/api/generated/core-domain'

import type { NoteSink } from './playbackRun'

type Voice = components['schemas']['Voice']

/** Seconds a note fades out over once its value ends. */
const AMP_RELEASE = 0.4

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** A MIDI pitch in scientific pitch notation, sharps for accidentals ("C#4"). */
export function noteName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

const loaded = new WeakMap<BaseAudioContext, Map<string, Promise<NoteSink>>>()

async function load(context: BaseAudioContext, voice: Voice): Promise<NoteSink> {
  const buffers = Object.fromEntries(voice.samples.map((sample) => [noteName(sample.pitch), sample.url]))
  const sampler = Sampler(context, {
    buffers,
    detune: 0,
    scheduler: Scheduler(context, { lookaheadMs: Number.POSITIVE_INFINITY }),
  })
  await sampler.ready

  let nextStopId = 0
  return {
    play({ midi, time, duration }) {
      return sampler.start({ note: midi, time, duration, ampRelease: AMP_RELEASE, stopId: `note-${nextStopId++}` })
    },
    stopAll() {
      sampler.stop()
    },
  }
}

/** The voice's sampler, loaded once per context; a failed load is forgotten so a retry loads again. */
export function loadVoiceSampler(context: BaseAudioContext, voice: Voice): Promise<NoteSink> {
  let voices = loaded.get(context)
  if (!voices) loaded.set(context, (voices = new Map()))
  const cached = voices.get(voice.voice_id)
  if (cached) return cached

  const pending = load(context, voice)
  voices.set(voice.voice_id, pending)
  pending.catch(() => voices.delete(voice.voice_id))
  return pending
}
