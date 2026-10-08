import type { components } from '@/api/generated/core-domain'
import type { CellPlace } from '@/shared/utils/fretboardCell'
import { clipTones } from '@/spikes/commit-point/clips'
import type { Tone } from '@/spikes/commit-point/wav'

type Option = components['schemas']['Option']

export interface ListeningItem {
  key: string
  prompt: string
  /** The clip, played as a file. */
  tones: Tone[]
  options: Option[]
}

export interface ChoiceItem {
  key: string
  prompt: string
  options: Option[]
}

const options = (labels: string[], right: string[]): Option[] =>
  labels.map((label) => ({ option_id: label, label, is_correct: right.includes(label) }))

const interval = (key: string, right: string, labels: string[]): ListeningItem => ({
  key,
  prompt: 'Which interval did you hear?',
  tones: clipTones(key) ?? [],
  options: options(labels, [right]),
})

export const P1_ITEMS: ListeningItem[] = [
  interval('m3', 'Minor 3rd', ['Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Perfect 5th']),
  interval('p5', 'Perfect 5th', ['Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th']),
  interval('M6', 'Major 6th', ['Minor 6th', 'Major 6th', 'Minor 7th', 'Octave']),
  interval('p4', 'Perfect 4th', ['Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th']),
  interval('m7', 'Minor 7th', ['Major 6th', 'Minor 7th', 'Major 7th', 'Octave']),
  interval('M3', 'Major 3rd', ['Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone']),
]

export const P2_ITEMS: ChoiceItem[] = [
  { key: 'c-triad', prompt: 'Which notes are in a C major chord?', options: options(['C', 'D', 'E', 'F', 'G', 'A'], ['C', 'E', 'G']) },
  { key: 'g-triad', prompt: 'Which notes are in a G major chord?', options: options(['G', 'A', 'B', 'C', 'D', 'E'], ['G', 'B', 'D']) },
  { key: 'c-minors', prompt: 'Which chords in C major are minor?', options: options(['C', 'Dm', 'Em', 'F', 'G', 'Am'], ['Dm', 'Em', 'Am']) },
  { key: 'am-triad', prompt: 'Which notes are in an A minor chord?', options: options(['A', 'B', 'C', 'C♯', 'E', 'F'], ['A', 'C', 'E']) },
  { key: 'g-sharps', prompt: 'Which notes of the D major scale are sharp?', options: options(['C♯', 'D', 'E', 'F♯', 'G', 'B'], ['C♯', 'F♯']) },
  { key: 'g-majors', prompt: 'Which chords in G major are major?', options: options(['G', 'Am', 'Bm', 'C', 'D', 'Em'], ['G', 'C', 'D']) },
]

/** Find-the-note cells on a six-string board from the open string to fret 11, never the same cell twice in a row. */
export function findTheNoteCells(count: number, random: () => number = Math.random): CellPlace[] {
  const cells: CellPlace[] = []
  while (cells.length < count) {
    const cell = { string: 1 + Math.floor(random() * 6), fret: Math.floor(random() * 12) }
    const last = cells[cells.length - 1]
    if (!last || last.string !== cell.string || last.fret !== cell.fret) cells.push(cell)
  }
  return cells
}

type Prompt = components['schemas']['Exercise']['prompt']

/** A one-paragraph prompt, as an exercise carries it. */
export function textPrompt(text: string): Prompt {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}
