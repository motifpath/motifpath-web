import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

/**
 * The clips an exercise asks the student to hear once before answering: a listening
 * exercise's own sound, or every option's sound when the options are sounds.
 */
export function exerciseAudioUrls(exercise: Exercise): string[] {
  if (exercise.exercise_type === 'audio_recognition') return exercise.audio_url ? [exercise.audio_url] : []
  if (exercise.exercise_type === 'audio_selection') return exercise.options.flatMap((option) => (option.audio_url ? [option.audio_url] : []))
  return []
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

/**
 * How many milliseconds of audio an exercise asks the student to hear once, which is
 * not time spent knowing the answer. Undefined for an exercise without audio, and when
 * any clip's length can't be known: a part of the audio would pass for all of it.
 */
export async function measureExerciseAudio(exercise: Exercise): Promise<number | undefined> {
  const urls = exerciseAudioUrls(exercise)
  if (urls.length === 0) return undefined
  let total = 0
  for (const seconds of await Promise.all(urls.map(clipSeconds))) {
    if (seconds === null) return undefined
    total += seconds
  }
  return Math.round(total * 1000)
}
