import type { components } from '@/api/generated/core-domain'
import { secondsPerWhole } from '@/shared/audio/timeline'
import { resolvePlayback } from '@/shared/utils/diagramPlayback'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Exercise = components['schemas']['Exercise']

/** Loads a diagram by id; null when it can't be loaded. */
export type DiagramLoader = (diagramId: string) => Promise<Diagram | null>

/**
 * The clips an exercise asks the student to hear once before answering: a listening
 * exercise's own sound, or every option's sound when the options are sounds.
 */
export function exerciseAudioUrls(exercise: Exercise): string[] {
  if (exercise.exercise_type === 'audio_recognition') return exercise.audio_url ? [exercise.audio_url] : []
  if (exercise.exercise_type === 'audio_selection') return exercise.options.flatMap((option) => (option.audio_url ? [option.audio_url] : []))
  return []
}

/** The diagrams an exercise plays as sounds instead of clips. */
export function exerciseDiagramSounds(exercise: Exercise): DiagramRef[] {
  if (exercise.exercise_type === 'audio_recognition') return exercise.diagram_ref ? [exercise.diagram_ref] : []
  if (exercise.exercise_type === 'audio_selection') return exercise.options.flatMap((option) => (option.diagram_ref ? [option.diagram_ref] : []))
  return []
}

/**
 * How long a diagram sounds when a usage plays it, in seconds: its playback's steps at the usage's
 * tempo, else the playback's own. A student slowing it down doesn't change it. Null when the
 * diagram has nothing to play.
 */
export function diagramSoundSeconds(diagram: Diagram, sound: DiagramRef): number | null {
  const playback = resolvePlayback(diagram, sound.playback?.playback_id)
  if (!playback) return null
  const whole = secondsPerWhole(sound.playback?.tempo_bpm ?? playback.tempo_bpm, playback.time_signature)
  return playback.steps.reduce((sum, step) => sum + (step.value.num / step.value.den) * whole, 0)
}

/** A clip's length in seconds, read from its metadata; null when it can't be known. */
function clipSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', () => resolve(Number.isFinite(audio.duration) ? audio.duration : null), { once: true })
    audio.addEventListener('error', () => resolve(null), { once: true })
    audio.src = url
  })
}

async function playedSeconds(sound: DiagramRef, loadDiagram: DiagramLoader | undefined): Promise<number | null> {
  const diagram = loadDiagram ? await loadDiagram(sound.diagram_id) : null
  return diagram ? diagramSoundSeconds(diagram, sound) : null
}

/**
 * How many milliseconds of audio an exercise asks the student to hear once, which is
 * not time spent knowing the answer. A sound played from a diagram is measured from the diagram
 * `loadDiagram` gives. Undefined for an exercise without audio, and when any sound's length can't
 * be known: a part of the audio would pass for all of it.
 */
export async function measureExerciseAudio(exercise: Exercise, loadDiagram?: DiagramLoader): Promise<number | undefined> {
  const urls = exerciseAudioUrls(exercise)
  const sounds = exerciseDiagramSounds(exercise)
  if (urls.length === 0 && sounds.length === 0) return undefined
  const lengths = await Promise.all([...urls.map(clipSeconds), ...sounds.map((sound) => playedSeconds(sound, loadDiagram))])
  let total = 0
  for (const seconds of lengths) {
    if (seconds === null) return undefined
    total += seconds
  }
  return Math.round(total * 1000)
}
