/**
 * Fixture content for the practice spike: one guitar, a few diagrams, a small
 * Skill/Concept tree, and one item of every kind the model must hold.
 */
import type { components } from '@/api/generated/core-domain'
import { fretboardCellItems } from '@/spikes/practice/drillGenerator'
import { GUITAR_ID } from '@/spikes/practice/fixtures/graph'
import type { GradeContext } from '@/spikes/practice/graders'
import type { PracticeItem } from '@/spikes/practice/model'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramPosition = components['schemas']['DiagramPosition']
type SequenceStep = Diagram['sequence'][number]

export const STUDENT_ID = 'student-ana'
export const TEACHER_ID = 'teacher-bob'

export const guitar: Instrument = {
  instrument_id: GUITAR_ID,
  names: { en: '6-string guitar (standard tuning)' },
  languages: ['en'],
  family: 'fretted',
  string_count: 6,
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  default_voice_id: 'acoustic-guitar',
}

/** Skills the student has met on their path so far (knowledge-map keys). */
export const pathSkillIds = [
  'find-notes-root-strings',
  'alternate-picking',
  'play-pentatonic-position-1',
  'change-chords',
  'hear-intervals',
]

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
    instrument_ids: [guitar.instrument_id],
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

const power = (id: string, fret: number, root: string, fifth: string) => [
  pos(`${id}r`, 6, fret, 'R', root),
  pos(`${id}5`, 5, fret + 2, '5', fifth),
]
const powerPositions = [
  ...power('p0', 5, 'A', 'E'),
  ...power('p1', 3, 'G', 'D'),
  ...power('p2', 8, 'C', 'G'),
  ...power('p3', 10, 'D', 'A'),
]

/** Power chords on the root strings, moved by root name: needs the low-string notes. */
export const powerChordRiff = diagram(
  'diagram-power-chord-riff',
  'Power chords A5 – G5 – C5 – D5',
  'A',
  powerPositions,
  ['p0', 'p1', 'p2', 'p3'].flatMap((id) =>
    Array.from({ length: 2 }, () => ({ position_ids: [`${id}r`, `${id}5`], value: quarter, strum: 'down' as const })),
  ),
  80,
)

export const diagrams: Record<string, Diagram> = Object.fromEntries(
  [pentatonicRun, bluesLick, aMinorChord, cMajorChord, powerChordRiff].map((d) => [d.diagram_id, d]),
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

export const cellItems = fretboardCellItems(guitar, {
  maxFret: 11,
  skillIdFor: (s) => (s >= 5 ? 'find-notes-root-strings' : 'find-notes-top-strings'),
}).map((i) => ({
  ...i,
  concept_ids: ['note-names'],
}))

export const ALTERNATE_PICKING = 'play_along:diagram-pentatonic-run'
export const BLUES_LICK = 'play_along:diagram-blues-lick'
export const POWER_CHORDS = 'play_along:diagram-power-chord-riff'
export const AM_C_CHANGES = 'chord_change:diagram-a-minor:diagram-c-major'

export const items: PracticeItem[] = [
  ...cellItems,
  ...exercises.map((e) => ({
    kind: 'exercise' as const,
    item_key: `exercise:${e.exercise_id}`,
    label: e.prompt,
    skill_ids: ['hear-intervals'],
    concept_ids: ['interval-names'],
    exercise_id: e.exercise_id,
    estimated_seconds: 20,
  })),
  {
    kind: 'play_along',
    item_key: ALTERNATE_PICKING,
    label: 'Alternate picking — pentatonic up and down',
    skill_ids: ['alternate-picking'],
    concept_ids: ['pentatonic-shapes'],
    diagram_id: pentatonicRun.diagram_id,
    purpose: 'technique',
    params: { start_bpm: 70, target_bpm: 120, step_bpm: 5, cleans_to_advance: 2, loops: 2, count_in_beats: 4 },
  },
  {
    kind: 'play_along',
    item_key: BLUES_LICK,
    label: 'Blues lick in A',
    skill_ids: ['play-pentatonic-position-1'],
    concept_ids: ['minor-pentatonic'],
    diagram_id: bluesLick.diagram_id,
    purpose: 'repertoire',
    params: { start_bpm: 70, target_bpm: 100, step_bpm: 5, cleans_to_advance: 2, loops: 4, count_in_beats: 4 },
  },
  {
    kind: 'play_along',
    item_key: POWER_CHORDS,
    label: 'Power chords A5 – G5 – C5 – D5',
    skill_ids: ['play-power-chords'],
    concept_ids: [],
    diagram_id: powerChordRiff.diagram_id,
    purpose: 'technique',
    params: { start_bpm: 70, target_bpm: 110, step_bpm: 5, cleans_to_advance: 2, loops: 2, count_in_beats: 4 },
  },
  {
    kind: 'chord_change',
    item_key: AM_C_CHANGES,
    label: 'Am ↔ C changes',
    skill_ids: ['change-chords'],
    concept_ids: ['open-chord-shapes'],
    from_diagram_id: aMinorChord.diagram_id,
    to_diagram_id: cMajorChord.diagram_id,
    target_changes_per_minute: 60,
  },
]

/** The reference data graders check answers against. */
export const gradeContext: GradeContext = {
  tuningOf: (id) => (id === guitar.instrument_id ? (guitar.tuning ?? null) : null),
  exerciseKey: (id) => {
    const e = exercises.find((x) => x.exercise_id === id)
    return e
      ? { option_ids: e.options.map((o) => o.id), correct_option_ids: e.options.filter((o) => o.correct).map((o) => o.id) }
      : null
  },
}

export function itemByKey(key: string): PracticeItem | undefined {
  return items.find((i) => i.item_key === key)
}
