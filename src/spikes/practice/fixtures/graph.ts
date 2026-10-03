/**
 * A slice of the reviewed knowledge map (motifpath-specs catalogs/knowledge-map.yaml):
 * real keys, names, instruments, calibration levels and edges — only the nodes the
 * spike's items touch, their ancestors, and the nodes their `requires` edges point
 * at. Edges to nodes outside the slice are left out.
 */
import type { GraphEdge, GraphNode, KnowledgeGraph, MasteryLevel } from '@/spikes/practice/model'

export const GUITAR_ID = 'instrument-guitar'
const ELECTRIC_GUITAR_ID = 'instrument-electric-guitar'
export const BASS_ID = 'instrument-electric-bass'

/** The map's instrument aliases; `all` is the empty list. */
const ALL: string[] = []
const GUITARS = [GUITAR_ID, ELECTRIC_GUITAR_ID]
const FRETTED = [GUITAR_ID, ELECTRIC_GUITAR_ID, BASS_ID]
const BASS = [BASS_ID]

function skill(key: string, name: string, parent: string | null, instruments: string[], level: GraphNode['map_level'] = null): GraphNode {
  return { node_id: key, key, kind: 'skill', name, parent_id: parent, instrument_ids: instruments, map_level: level }
}

function concept(key: string, name: string, parent: string | null, instruments: string[], level: GraphNode['map_level'] = null): GraphNode {
  return { ...skill(key, name, parent, instruments, level), kind: 'concept' }
}

const nodes: GraphNode[] = [
  // Skills
  skill('fretboard-fluency', 'Fretboard fluency', null, FRETTED),
  skill('find-notes', 'Find notes on the fretboard', 'fretboard-fluency', FRETTED),
  skill('find-notes-root-strings', 'Find notes on the E and A strings', 'find-notes', FRETTED, 'B'),
  skill('find-notes-top-strings', 'Find notes on the D string and above', 'find-notes', FRETTED, 'EI'),
  skill('play-scale-positions', 'Play scale positions', 'fretboard-fluency', GUITARS),
  skill('play-pentatonic-positions', 'Play pentatonic positions', 'play-scale-positions', GUITARS),
  skill('play-pentatonic-position-1', 'Play minor pentatonic position 1', 'play-pentatonic-positions', GUITARS, 'B'),
  skill('play-all-pentatonic-positions', 'Play all five pentatonic positions', 'play-pentatonic-positions', GUITARS, 'EI'),
  skill('picking-technique', 'Picking and plucking technique', null, FRETTED),
  skill('alternate-picking', 'Alternate picking', 'picking-technique', FRETTED, 'B'),
  skill('chords-rhythm', 'Chords and rhythm', null, ALL),
  skill('play-open-chords', 'Play open chords', 'chords-rhythm', GUITARS, 'B'),
  skill('change-chords', 'Change chords smoothly', 'chords-rhythm', GUITARS, 'B'),
  skill('play-power-chords', 'Play power chords', 'chords-rhythm', GUITARS, 'B'),
  skill('ear', 'Ear', null, ALL),
  skill('match-pitch', 'Match a pitch', 'ear', ALL, 'B'),
  skill('hear-intervals', 'Recognise intervals by ear', 'ear', ALL, 'EI'),
  skill('improvisation', 'Improvisation', null, ALL),
  skill('improvise-blues', 'Improvise over a blues', 'improvisation', ALL, 'EI'),
  skill('reading', 'Reading', null, ALL),
  skill('read-bass-clef', 'Read bass clef in first position', 'reading', BASS, 'B'),
  // Concepts
  concept('notes-fretboard', 'Notes and the fretboard', null, ALL),
  concept('note-names', 'Note names', 'notes-fretboard', ALL, 'B'),
  concept('scales', 'Scales', null, ALL),
  concept('minor-pentatonic', 'Minor pentatonic scale', 'scales', ALL, 'B'),
  concept('pentatonic-shapes', 'Pentatonic shapes (positions 1–5)', 'minor-pentatonic', GUITARS, 'EI'),
  concept('chords', 'Chords', null, ALL),
  concept('open-chord-shapes', 'Open chord shapes', 'chords', GUITARS, 'B'),
  concept('intervals', 'Intervals', null, ALL),
  concept('interval-names', 'Interval names', 'intervals', ALL, 'EI'),
]

const requires = (from: string, to: string, level: MasteryLevel): GraphEdge => ({ from_id: from, to_id: to, type: 'requires', level })
const applies = (from: string, to: string): GraphEdge => ({ from_id: from, to_id: to, type: 'applies', level: null })

const edges: GraphEdge[] = [
  requires('change-chords', 'play-open-chords', 'accurate'),
  requires('play-power-chords', 'find-notes-root-strings', 'accurate'),
  requires('play-pentatonic-position-1', 'alternate-picking', 'accurate'),
  requires('play-all-pentatonic-positions', 'play-pentatonic-position-1', 'fluent'),
  requires('improvise-blues', 'play-pentatonic-position-1', 'fluent'),
  requires('hear-intervals', 'match-pitch', 'accurate'),
  requires('read-bass-clef', 'find-notes-root-strings', 'accurate'),
  applies('find-notes-root-strings', 'note-names'),
  applies('find-notes-top-strings', 'note-names'),
  applies('play-pentatonic-position-1', 'minor-pentatonic'),
  applies('play-pentatonic-position-1', 'pentatonic-shapes'),
  applies('play-open-chords', 'open-chord-shapes'),
  applies('change-chords', 'open-chord-shapes'),
  applies('hear-intervals', 'interval-names'),
  applies('improvise-blues', 'minor-pentatonic'),
  applies('match-pitch', 'note-names'),
]

export const graph: KnowledgeGraph = { nodes, edges }

export function nodeName(id: string): string {
  return nodes.find((n) => n.node_id === id)?.name ?? id
}
