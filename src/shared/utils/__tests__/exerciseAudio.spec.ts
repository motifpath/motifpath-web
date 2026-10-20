import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { exerciseAudioUrls, measureExerciseAudio } from '@/shared/utils/exerciseAudio'
import { makeDiagramRef, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Exercise = components['schemas']['Exercise']

function exercise(fields: Partial<Exercise>): Exercise {
  return {
    exercise_id: 'ex-1',
    title: 't',
    prompt: plainTextPrompt('p'),
    exercise_type: 'text_response',
    options: [],
    challenge_ids: [],
    content_node_ids: [],
    skills: [],
    concepts: [],
    remediation_targets: [],
    languages: [{ code: 'en', name: 'English' }],
    instrument_ids: [],
    created_at: '2026-10-06T00:00:00Z',
    updated_at: '2026-10-06T00:00:00Z',
    ...fields,
  }
}

const listening = exercise({
  exercise_type: 'audio_recognition',
  audio_url: 'https://media.test/stimulus.mp3',
  options: [
    { option_id: 'o1', is_correct: true, label: 'Minor third' },
    { option_id: 'o2', is_correct: false, label: 'Major third' },
  ],
})

const soundOptions = exercise({
  exercise_type: 'audio_selection',
  options: [
    { option_id: 'o1', is_correct: true, audio_url: 'https://media.test/a.mp3' },
    { option_id: 'o2', is_correct: false, audio_url: 'https://media.test/b.mp3' },
  ],
})

/** Seconds each fake clip lasts, by URL; a URL left out fails to load. */
let durations: Record<string, number> = {}

class FakeAudio extends EventTarget {
  preload = ''
  duration = NaN
  set src(url: string) {
    queueMicrotask(() => {
      if (url in durations) {
        this.duration = durations[url]!
        this.dispatchEvent(new Event('loadedmetadata'))
      } else {
        this.dispatchEvent(new Event('error'))
      }
    })
  }
}

// The riff's steps add up to 5/8 of a whole note: 1667 ms at its own 90 BPM in 4/4.
const riff = makeSequencedFrettedDiagram()
const loadRiff = (id: string): Promise<Diagram | null> => Promise.resolve(id === riff.diagram_id ? riff : null)
const riffSound = makeDiagramRef({
  diagram_id: riff.diagram_id,
  playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false },
})

const listeningToADiagram = exercise({
  exercise_type: 'audio_recognition',
  diagram_ref: riffSound,
  options: listening.options,
})

describe('exerciseAudioUrls', () => {
  it('is the stimulus clip of a listening exercise', () => {
    expect(exerciseAudioUrls(listening)).toEqual(['https://media.test/stimulus.mp3'])
  })

  it('is every option’s clip when the options are sounds', () => {
    expect(exerciseAudioUrls(soundOptions)).toEqual(['https://media.test/a.mp3', 'https://media.test/b.mp3'])
  })

  it('is nothing for an exercise without audio', () => {
    expect(exerciseAudioUrls(exercise({ exercise_type: 'image_choice' }))).toEqual([])
  })
})

describe('measureExerciseAudio', () => {
  beforeEach(() => vi.stubGlobal('Audio', FakeAudio))
  afterEach(() => {
    vi.unstubAllGlobals()
    durations = {}
  })

  it('is the length of a listening exercise’s clip, in milliseconds', async () => {
    durations = { 'https://media.test/stimulus.mp3': 5 }
    await expect(measureExerciseAudio(listening)).resolves.toBe(5000)
  })

  it('adds up the option clips when the options are sounds', async () => {
    durations = { 'https://media.test/a.mp3': 1.25, 'https://media.test/b.mp3': 2.5004 }
    await expect(measureExerciseAudio(soundOptions)).resolves.toBe(3750)
  })

  it('is undefined for an exercise without audio', async () => {
    await expect(measureExerciseAudio(exercise({ exercise_type: 'text_response' }))).resolves.toBeUndefined()
  })

  it('is undefined when a clip can’t be loaded, rather than a part of the audio', async () => {
    durations = { 'https://media.test/a.mp3': 1.25 }
    await expect(measureExerciseAudio(soundOptions)).resolves.toBeUndefined()
  })

  it('is undefined when a clip has no finite length', async () => {
    durations = { 'https://media.test/stimulus.mp3': Infinity }
    await expect(measureExerciseAudio(listening)).resolves.toBeUndefined()
  })

  describe('a sound played from a diagram', () => {
    it('is the playback’s length at its own tempo', async () => {
      await expect(measureExerciseAudio(listeningToADiagram, loadRiff)).resolves.toBe(1667)
    })

    it('is the playback’s length at the tempo the exercise sets', async () => {
      const faster = exercise({
        ...listeningToADiagram,
        diagram_ref: { ...riffSound, playback: { ...riffSound.playback!, tempo_bpm: 120 } },
      })
      await expect(measureExerciseAudio(faster, loadRiff)).resolves.toBe(1250)
    })

    it('adds a diagram option’s sound to the clips', async () => {
      vi.stubGlobal('Audio', FakeAudio)
      durations = { 'https://media.test/a.mp3': 1.25 }
      const mixed = exercise({
        exercise_type: 'audio_selection',
        options: [
          { option_id: 'o1', is_correct: true, audio_url: 'https://media.test/a.mp3' },
          { option_id: 'o2', is_correct: false, diagram_ref: riffSound },
        ],
      })
      await expect(measureExerciseAudio(mixed, loadRiff)).resolves.toBe(2917)
    })

    it('is undefined when the diagram can’t be loaded', async () => {
      await expect(measureExerciseAudio(listeningToADiagram, () => Promise.resolve(null))).resolves.toBeUndefined()
    })

    it('is undefined when nothing loads diagrams', async () => {
      await expect(measureExerciseAudio(listeningToADiagram)).resolves.toBeUndefined()
    })
  })
})
