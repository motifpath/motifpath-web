/**
 * Fixture content for the practice spike: one guitar, a few diagrams, a small
 * Skill/Concept tree, and one item of every kind the model must hold.
 */
import type { components } from '@/api/generated/core-domain'
import { fretboardCellItems } from '@/spikes/practice/drillGenerator'
import type { PracticeItem, TaxonomyNode } from '@/spikes/practice/model'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramPosition = components['schemas']['DiagramPosition']
type SequenceStep = Diagram['sequence'][number]

export const STUDENT_ID = 'student-ana'
export const TEACHER_ID = 'teacher-bob'

export const guitar: Instrument = {
  instrument_id: 'instrument-guitar',
  names: { en: '6-string guitar (standard tuning)' },
  languages: ['en'],
  family: 'fretted',
  string_count: 6,
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  default_voice_id: 'acoustic-guitar',
}

// ── Taxonomy ───────────────────────────────────────────────────────────────────

export const skills: TaxonomyNode[] = [
  { id: 'fretboard-knowledge', name: 'Fretboard knowledge', parent_id: null },
  { id: 'fretboard-notes', name: 'Notes on the fretboard', parent_id: 'fretboard-knowledge' },
  ...[6, 5, 4, 3, 2, 1].map((s) => ({ id: `string-${s}`, name: `String ${s}`, parent_id: 'fretboard-notes' })),
  { id: 'guitar-technique', name: 'Guitar technique', parent_id: null },
  { id: 'picking', name: 'Picking', parent_id: 'guitar-technique' },
  { id: 'alternate-picking', name: 'Alternate picking', parent_id: 'picking' },
  { id: 'chord-changes', name: 'Chord changes', parent_id: 'guitar-technique' },
  { id: 'ear-training', name: 'Ear training', parent_id: null },
  { id: 'intervals-by-ear', name: 'Intervals by ear', parent_id: 'ear-training' },
]

export const concepts: TaxonomyNode[] = [
  { id: 'note-names', name: 'Note names', parent_id: null },
  { id: 'pentatonic-scale', name: 'Pentatonic scale', parent_id: null },
  { id: 'open-chords', name: 'Open chords', parent_id: null },
  { id: 'intervals', name: 'Intervals', parent_id: null },
]

/** Skills the student has met on their path so far. */
export const pathSkillIds = ['string-6', 'string-5', 'alternate-picking', 'chord-changes', 'intervals-by-ear']

// ── Diagrams ───────────────────────────────────────────────────────────────────

const eighth = { num: 1, den: 8 }
const quarter = { num: 1, den: 4 }

function pos(id: string, string: number, fret: number, interval: DiagramPosition['interval'], note: string): DiagramPosition {
  return { position_id: id, string, fret, interval, note_name: note, shape: 'dot' }
}

function diagram(id: string, name: string, root: string, positions: DiagramPosition[], sequence: SequenceStep[], tempo: number): Diagram {
  return {
    diagram_id: id,
    instrument_id: guitar.instrument_id,
    names: { en: name },
    languages: ['en'],
    kind: 'custom',
    created_by: { user_id: TEACHER_ID, display_name: 'Bob Ferreira' },
    root_note: root,
    label_display: 'interval',
    color: null,
    mode: 'minor',
    tempo_bpm: tempo,
    time_signature: { beats: 4, beat_value: 4 },
    sequence,
    positions,
    regions: [],
    classification: { skills: [], concepts: [] },
    created_at: '2026-09-21T12:00:00Z',
  }
}

const box = [
  pos('b0', 6, 5, 'R', 'A'),
  pos('b1', 6, 8, 'b3', 'C'),
  pos('b2', 5, 5, '4', 'D'),
  pos('b3', 5, 7, '5', 'E'),
  pos('b4', 4, 5, 'b7', 'G'),
  pos('b5', 4, 7, 'R', 'A'),
  pos('b6', 3, 5, 'b3', 'C'),
  pos('b7', 3, 7, '4', 'D'),
  pos('b8', 2, 5, '5', 'E'),
  pos('b9', 2, 8, 'b7', 'G'),
  pos('b10', 1, 5, 'R', 'A'),
  pos('b11', 1, 8, 'b3', 'C'),
]

/** A minor pentatonic box, played up and down in eighths: the alternate-picking drill. */
export const pentatonicRun = diagram(
  'diagram-pentatonic-run',
  'A minor pentatonic — up and down',
  'A',
  box,
  [...box, ...[...box].reverse()].map((p) => ({ position_ids: [p.position_id!], value: eighth, strum: 'none' as const })),
  70,
)

const lickPositions = [
  pos('l0', 3, 7, '4', 'D'),
  pos('l1', 3, 5, 'b3', 'C'),
  pos('l2', 4, 7, 'R', 'A'),
  pos('l3', 4, 5, 'b7', 'G'),
  pos('l4', 5, 7, '5', 'E'),
  pos('l5', 5, 5, '4', 'D'),
  pos('l6', 6, 8, 'b3', 'C'),
  pos('l7', 6, 5, 'R', 'A'),
]

/** A short descending blues lick from the same box: applying the drill to music. */
export const bluesLick = diagram(
  'diagram-blues-lick',
  'Blues lick in A',
  'A',
  lickPositions,
  [
    ...lickPositions.slice(0, 6).map((p) => ({ position_ids: [p.position_id!], value: eighth, strum: 'none' as const })),
    { position_ids: ['l6'], value: quarter, strum: 'none' },
    { position_ids: ['l7'], value: quarter, strum: 'none' },
  ],
  80,
)

export const aMinorChord = diagram(
  'diagram-a-minor',
  'A minor (open)',
  'A',
  [pos('am0', 5, 0, 'R', 'A'), pos('am1', 4, 2, '5', 'E'), pos('am2', 3, 2, 'R', 'A'), pos('am3', 2, 1, 'b3', 'C'), pos('am4', 1, 0, '5', 'E')],
  Array.from({ length: 4 }, () => ({ position_ids: ['am0', 'am1', 'am2', 'am3', 'am4'], value: quarter, strum: 'down' as const })),
  80,
)

export const cMajorChord = {
  ...diagram(
    'diagram-c-major',
    'C major (open)',
    'C',
    [pos('c0', 5, 3, 'R', 'C'), pos('c1', 4, 2, '3', 'E'), pos('c2', 3, 0, '5', 'G'), pos('c3', 2, 1, 'R', 'C'), pos('c4', 1, 0, '3', 'E')],
    Array.from({ length: 4 }, () => ({ position_ids: ['c0', 'c1', 'c2', 'c3', 'c4'], value: quarter, strum: 'down' as const })),
    80,
  ),
  mode: 'major' as const,
}

export const diagrams: Record<string, Diagram> = Object.fromEntries(
  [pentatonicRun, bluesLick, aMinorChord, cMajorChord].map((d) => [d.diagram_id, d]),
)

// ── Authored exercises (simplified: text options only) ───────────────────────

export interface SpikeExercise {
  exercise_id: string
  prompt: string
  options: { id: string; text: string; correct: boolean }[]
}

export const exercises: SpikeExercise[] = [
  {
    exercise_id: 'exercise-minor-third',
    prompt: 'From A, which note is the minor third?',
    options: [
      { id: 'a', text: 'C', correct: true },
      { id: 'b', text: 'C#', correct: false },
      { id: 'c', text: 'D', correct: false },
      { id: 'd', text: 'B', correct: false },
    ],
  },
  {
    exercise_id: 'exercise-fifth',
    prompt: 'In the A minor pentatonic, which note is the fifth?',
    options: [
      { id: 'a', text: 'D', correct: false },
      { id: 'b', text: 'E', correct: true },
      { id: 'c', text: 'G', correct: false },
      { id: 'd', text: 'F', correct: false },
    ],
  },
]

// ── Items ──────────────────────────────────────────────────────────────────────

export const cellItems = fretboardCellItems(guitar, { maxFret: 11, skillIdFor: (s) => `string-${s}` }).map((i) => ({
  ...i,
  concept_ids: ['note-names'],
}))

export const ALTERNATE_PICKING = 'play_along:diagram-pentatonic-run'
export const BLUES_LICK = 'play_along:diagram-blues-lick'
export const AM_C_CHANGES = 'chord_change:diagram-a-minor:diagram-c-major'

export const items: PracticeItem[] = [
  ...cellItems,
  ...exercises.map((e) => ({
    kind: 'exercise' as const,
    item_key: `exercise:${e.exercise_id}`,
    label: e.prompt,
    skill_ids: ['intervals-by-ear'],
    concept_ids: ['intervals'],
    exercise_id: e.exercise_id,
    estimated_seconds: 20,
  })),
  {
    kind: 'play_along',
    item_key: ALTERNATE_PICKING,
    label: 'Alternate picking — pentatonic up and down',
    skill_ids: ['alternate-picking'],
    concept_ids: ['pentatonic-scale'],
    diagram_id: pentatonicRun.diagram_id,
    purpose: 'technique',
    params: { start_bpm: 70, target_bpm: 120, step_bpm: 5, cleans_to_advance: 2, loops: 2, count_in_beats: 4 },
  },
  {
    kind: 'play_along',
    item_key: BLUES_LICK,
    label: 'Blues lick in A',
    skill_ids: ['alternate-picking'],
    concept_ids: ['pentatonic-scale'],
    diagram_id: bluesLick.diagram_id,
    purpose: 'repertoire',
    params: { start_bpm: 70, target_bpm: 100, step_bpm: 5, cleans_to_advance: 2, loops: 4, count_in_beats: 4 },
  },
  {
    kind: 'chord_change',
    item_key: AM_C_CHANGES,
    label: 'Am ↔ C changes',
    skill_ids: ['chord-changes'],
    concept_ids: ['open-chords'],
    from_diagram_id: aMinorChord.diagram_id,
    to_diagram_id: cMajorChord.diagram_id,
    target_changes_per_minute: 60,
  },
]

export function itemByKey(key: string): PracticeItem | undefined {
  return items.find((i) => i.item_key === key)
}
