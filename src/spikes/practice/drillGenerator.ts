/**
 * Generated fretboard drills: every cell of the fretboard is an item, and two
 * kinds of question ask about it. The answer key comes from the tuning, so the
 * drill needs no authored content.
 */
import type { components } from '@/api/generated/core-domain'
import { frettedPitch } from '@/shared/utils/pitch'
import type { FretboardCellItem } from '@/spikes/practice/model'
import { shuffled } from '@/spikes/practice/random'
import type { Random } from '@/spikes/practice/random'

type Instrument = components['schemas']['Instrument']

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function noteName(midi: number): string {
  return SHARP_NAMES[((midi % 12) + 12) % 12]!
}

export function fretboardCellItems(
  instrument: Instrument,
  options: { maxFret: number; skillIdFor: (string: number) => string },
): FretboardCellItem[] {
  const tuning = instrument.tuning ?? []
  const items: FretboardCellItem[] = []
  for (let string = tuning.length; string >= 1; string--) {
    for (let fret = 0; fret <= options.maxFret; fret++) {
      const pitch = frettedPitch(tuning, string, fret)
      if (pitch === null) continue
      const note = noteName(pitch)
      items.push({
        kind: 'fretboard_cell',
        item_key: `fretboard_cell:${instrument.instrument_id}:${string}:${fret}`,
        label: `${note} — string ${string}, fret ${fret}`,
        skill_ids: [options.skillIdFor(string)],
        concept_ids: [],
        instrument_id: instrument.instrument_id,
        instrument_ids: [instrument.instrument_id],
        string,
        fret,
        note_name: note,
      })
    }
  }
  return items
}

/** "Which note is this?" — the cell is shown, four names offered. */
export interface NameTheNoteQuestion {
  prompt: 'name_the_note'
  item_key: string
  string: number
  fret: number
  choices: string[]
  answer: string
}

/** "Where is G on string 6?" — every fret of the string can be tapped. */
export interface FindTheNoteQuestion {
  prompt: 'find_the_note'
  item_key: string
  string: number
  note_name: string
  frets: number[]
  answer_fret: number
}

export type DrillQuestion = NameTheNoteQuestion | FindTheNoteQuestion

export function nameTheNoteQuestion(item: FretboardCellItem, random: Random): NameTheNoteQuestion {
  const distractors = shuffled(
    SHARP_NAMES.filter((n) => n !== item.note_name),
    random,
  ).slice(0, 3)
  return {
    prompt: 'name_the_note',
    item_key: item.item_key,
    string: item.string,
    fret: item.fret,
    choices: shuffled([item.note_name, ...distractors], random),
    answer: item.note_name,
  }
}

export function findTheNoteQuestion(item: FretboardCellItem, maxFret: number): FindTheNoteQuestion {
  return {
    prompt: 'find_the_note',
    item_key: item.item_key,
    string: item.string,
    note_name: item.note_name,
    frets: Array.from({ length: maxFret + 1 }, (_, f) => f),
    answer_fret: item.fret,
  }
}
