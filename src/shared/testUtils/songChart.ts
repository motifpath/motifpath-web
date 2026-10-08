import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram, makePlayback } from '@/shared/testUtils/diagram'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']
type LyricLine = components['schemas']['SongChartLyricLine']
type Section = components['schemas']['SongChartSection']

export function makeAnchor(anchorId: string, writtenSymbol: string, overrides: Partial<Anchor> = {}): Anchor {
  return { anchorId, writtenSymbol, chordDefinitionId: null, chordVoicingId: null, ...overrides }
}

/** A lyric line from its runs: each run's text, with the anchor its chord sits on, if any. */
export function makeLyricLine(...runs: Array<[string, Anchor | null]>): LyricLine {
  return {
    type: 'lyricLine',
    content: runs.map(([text, anchor]) =>
      anchor ? { type: 'text', text, marks: [{ type: 'chordAnchor', attrs: anchor }] } : { type: 'text', text },
    ),
  }
}

export function makeSection(lines: Section['content'], overrides: Partial<Section['attrs']> = {}): Section {
  return { type: 'section', attrs: { kind: 'verse', label: null, ...overrides }, content: lines }
}

export function makeVoicing(id: string, chordId: string, overrides: Partial<ChordVoicing> = {}): ChordVoicing {
  return {
    chord_voicing_id: id,
    chord_definition_id: chordId,
    diagram_id: `diagram-${id}`,
    instrument_id: 'instrument-guitar',
    tuning_fingerprint: 'E2-A2-D3-G3-B3-E4',
    fret_window: { lowest_fret: 0, highest_fret: 3 },
    fingering: [],
    muted_strings: [],
    omitted_intervals: [],
    difficulty: 'beginner',
    technique_tags: ['open'],
    shape_family: 'open',
    is_movable: false,
    recommended_rank: 1,
    catalog_status: 'active',
    provenance: { source: 'hand_authored', template_key: null },
    ...overrides,
  }
}

export function makeChord(id: string, symbol: string, voicings: ChordVoicing[], overrides: Partial<ChordDefinition> = {}): ChordDefinition {
  return {
    chord_definition_id: id,
    canonical_symbol: symbol,
    root: symbol.charAt(0),
    root_pitch_class: 0,
    quality: 'major',
    formula: ['R', '3', '5'],
    bass: null,
    aliases: [],
    voicings,
    ...overrides,
  }
}

/** A voicing's diagram, with an arpeggio and a strum playback. */
export function makeVoicingDiagram(voicing: ChordVoicing): Diagram {
  return makeFrettedDiagram({
    diagram_id: voicing.diagram_id,
    purpose: 'chord_voicing',
    names: { en: `Voicing ${voicing.chord_voicing_id}` },
    languages: ['en'],
    playbacks: [
      makePlayback({ playback_id: `${voicing.chord_voicing_id}-strum`, names: { en: 'Strum' } }),
      makePlayback({ playback_id: `${voicing.chord_voicing_id}-arpeggio`, names: { en: 'Arpeggio' } }),
    ],
    default_playback_id: `${voicing.chord_voicing_id}-strum`,
  })
}

export const gOpen = makeVoicing('g-open', 'chord-g')
export const gEShape = makeVoicing('g-e-shape-3', 'chord-g', { recommended_rank: 2, shape_family: 'e_shape' })
export const cOpen = makeVoicing('c-open', 'chord-c')
export const cBarre = makeVoicing('c-a-shape-3', 'chord-c', { recommended_rank: 2, shape_family: 'a_shape' })
export const chordG = makeChord('chord-g', 'G', [gOpen, gEShape], { root_pitch_class: 7 })
export const chordC = makeChord('chord-c', 'C', [cOpen, cBarre])

/**
 * "Asa Branca" at revision 2: "[G]Quando olhei a [C]terra ardendo" in its first section, then a
 * chorus. Override `body` for other lines.
 */
export function makeLearnerSongChart(overrides: Partial<LearnerSongChart> = {}): LearnerSongChart {
  return {
    song_chart_id: 'chart-asa-branca',
    revision_number: 2,
    title: 'Asa Branca',
    artist: 'Luiz Gonzaga',
    language: 'pt_BR',
    concert_key: 'G',
    capo_fret: 0,
    tempo_bpm: null,
    time_signature: null,
    tuning_fingerprint: 'E2-A2-D3-G3-B3-E4',
    body: {
      type: 'doc',
      content: [
        makeSection([
          makeLyricLine(
            ['Quando olhei a ', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g' })],
            ['terra ardendo', makeAnchor('a2', 'C', { chordDefinitionId: 'chord-c' })],
          ),
        ]),
        makeSection([makeLyricLine(['Que braseiro', makeAnchor('a3', 'G', { chordDefinitionId: 'chord-g' })])], {
          kind: 'chorus',
          label: 'Refrão',
        }),
      ],
    },
    chords: [chordG, chordC],
    diagrams: [gOpen, gEShape, cOpen, cBarre].map(makeVoicingDiagram),
    ...overrides,
  }
}
