import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']

/** A 6-string guitar `Instrument` fixture, standard tuning. */
export function makeFrettedInstrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    instrument_id: 'instrument-guitar',
    names: { en: '6-string guitar (standard tuning)', pt_BR: 'Violão de 6 cordas (afinação padrão)' },
    languages: ['en', 'pt_BR'],
    family: 'fretted',
    string_count: 6,
    tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
    ...overrides,
  }
}

/** The A minor pentatonic, position 1 — the same shape used in the ADR-027 spike. */
export function makeFrettedDiagram(overrides: Partial<Diagram> = {}): Diagram {
  return {
    diagram_id: 'diagram-a-minor-pentatonic-1',
    instrument_id: 'instrument-guitar',
    names: { en: 'Minor Pentatonic — Position 1', pt_BR: 'Pentatônica menor — Posição 1' },
    languages: ['en', 'pt_BR'],
    kind: 'custom',
    created_by: { user_id: 'user-teacher', display_name: 'Bob Ferreira' },
    root_note: 'A',
    label_display: 'interval',
    color: null,
    positions: [
      { position_id: 'p0', string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'dot', sequence_index: 0 },
      {
        position_id: 'p1',
        string: 6,
        fret: 8,
        interval: 'b3',
        note_name: 'C',
        shape: 'dot',
        sequence_index: 1,
      },
      { position_id: 'p2', string: 5, fret: 5, interval: '4', note_name: 'D', shape: 'dot', sequence_index: 2 },
      { position_id: 'p3', string: 5, fret: 7, interval: '5', note_name: 'E', shape: 'dot', sequence_index: 3 },
      {
        position_id: 'p4',
        string: 4,
        fret: 5,
        interval: 'b7',
        note_name: 'G',
        shape: 'dot',
        sequence_index: 4,
      },
      { position_id: 'p5', string: 4, fret: 7, interval: 'R', note_name: 'A', shape: 'dot', sequence_index: 5 },
    ],
    classification: { skills: [], concepts: [] },
    created_at: '2026-09-21T12:00:00Z',
    ...overrides,
  }
}

/** A minimal `DiagramRef` pointing at `diagram-a-minor-pentatonic-1`, default layers/styling. */
export function makeDiagramRef(overrides: Partial<DiagramRef> = {}): DiagramRef {
  return {
    diagram_id: 'diagram-a-minor-pentatonic-1',
    layers: { intervals: true },
    ...overrides,
  }
}
