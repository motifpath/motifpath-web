import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type Finger = ChordVoicing['fingering'][number]['finger']
type DiagramPosition = Diagram['positions'][number]

/** A chord voicing as the drills draw and play it: the voicing and its diagram. */
export interface DrillVoicing {
  voicing: ChordVoicing
  diagram: Diagram
}

/** One string of a voicing: muted, or a fret with its note, its interval and the finger on it. */
type StringNote = null | [fret: number, note: NonNullable<DiagramPosition['note_name']>, interval: DiagramPosition['interval'], finger?: Finger]

/** Builds a voicing from its six strings, the low E first, as a chord book writes it. */
function guitarVoicing(symbol: string, root: string, strings: StringNote[]): DrillVoicing {
  const id = `voicing-${symbol.toLowerCase()}`
  const notes = strings.flatMap((note, i) => (note ? [{ string: 6 - i, note }] : []))
  const positions: DiagramPosition[] = notes.map(({ string, note: [fret, noteName, interval] }) => ({
    position_id: `${id}-s${string}`,
    string,
    fret,
    interval,
    note_name: noteName,
    shape: 'dot',
  }))
  const fretted = notes.filter(({ note: [fret] }) => fret > 0).map(({ note: [fret] }) => fret)
  const voicing = makeVoicing(id, `chord-${symbol.toLowerCase()}`, {
    diagram_id: `diagram-${id}`,
    fret_window: { lowest_fret: Math.min(...fretted), highest_fret: Math.max(...fretted) },
    fingering: notes.flatMap(({ string, note: [, , , finger] }) => (finger ? [{ position_id: `${id}-s${string}`, finger }] : [])),
    muted_strings: strings.flatMap((note, i) => (note ? [] : [6 - i])),
  })
  const diagram = makeFrettedDiagram({
    diagram_id: voicing.diagram_id,
    purpose: 'chord_voicing',
    names: { en: symbol },
    languages: ['en'],
    root_note: root,
    mode: null,
    positions,
  })
  return { voicing, diagram }
}

/** The catalog's open and first-position voicings the drill screens are designed with. */
export const drillVoicings = {
  C: guitarVoicing('C', 'C', [null, [3, 'C', 'R', '3'], [2, 'E', '3', '2'], [0, 'G', '5'], [1, 'C', 'R', '1'], [0, 'E', '3']]),
  G: guitarVoicing('G', 'G', [[3, 'G', 'R', '2'], [2, 'B', '3', '1'], [0, 'D', '5'], [0, 'G', 'R'], [0, 'B', '3'], [3, 'G', 'R', '3']]),
  D: guitarVoicing('D', 'D', [null, null, [0, 'D', 'R'], [2, 'A', '5', '1'], [3, 'D', 'R', '3'], [2, 'F#', '3', '2']]),
  Em: guitarVoicing('Em', 'E', [[0, 'E', 'R'], [2, 'B', '5', '2'], [2, 'E', 'R', '3'], [0, 'G', 'b3'], [0, 'B', '5'], [0, 'E', 'R']]),
  Am: guitarVoicing('Am', 'A', [null, [0, 'A', 'R'], [2, 'E', '5', '2'], [2, 'A', 'R', '3'], [1, 'C', 'b3', '1'], [0, 'E', '5']]),
  Bm: guitarVoicing('Bm', 'B', [null, [2, 'B', 'R', '1'], [4, 'F#', '5', '3'], [4, 'B', 'R', '4'], [3, 'D', 'b3', '2'], [2, 'F#', '5', '1']]),
  A7: guitarVoicing('A7', 'A', [null, [0, 'A', 'R'], [2, 'E', '5', '2'], [0, 'G', 'b7'], [2, 'C#', '3', '3'], [0, 'E', '5']]),
  D7: guitarVoicing('D7', 'D', [null, null, [0, 'D', 'R'], [2, 'A', '5', '2'], [1, 'C', 'b7', '1'], [2, 'F#', '3', '3']]),
  F: guitarVoicing('F', 'F', [[1, 'F', 'R', '1'], [3, 'C', '5', '3'], [3, 'F', 'R', '4'], [2, 'A', '3', '2'], [1, 'C', '5', '1'], [1, 'F', 'R', '1']]),
} satisfies Record<string, DrillVoicing>

export type DrillChordSymbol = keyof typeof drillVoicings

export const drillGuitar: Instrument = makeFrettedInstrument()

/** A 4-string bass in standard tuning, as the mock API lists it. */
export const drillBass: Instrument = makeFrettedInstrument({
  instrument_id: 'instrument-bass',
  names: { en: '4-string bass (standard tuning)', pt_BR: 'Baixo de 4 cordas (afinação padrão)' },
  icon: 'electric_bass',
  string_count: 4,
  tuning: ['E1', 'A1', 'D2', 'G2'],
  default_voice_id: 'electric-bass',
})
