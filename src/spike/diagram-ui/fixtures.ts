import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { frettedPitch } from '@/shared/utils/pitch'

type Shape = components['schemas']['DiagramPosition']['shape']
type Interval = components['schemas']['DiagramPosition']['interval']
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const INTERVALS: Interval[] = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

/** Synthetic fixtures for reviewing the board; labels are derived from their actual tuning. */
export function createStudyFixture(fixture: string, shape: Shape | 'mixed', sequence: string) {
  const instrument = makeFrettedInstrument(fixture === 'bass' ? { string_count: 4, tuning: ['E1', 'A1', 'D2', 'G2'] } : {})
  const diagram = makeFrettedDiagram({ root_note: fixture === 'open' || fixture === 'octave' ? 'E' : 'A', tempo_bpm: 90 })
  const pairs = [[5, 8], [5, 8], [5, 7], [5, 7], [5, 7], [5, 8]]
  const openFrets = [0, 3, 0, 3, 0, 2, 0, 2, 0, 2, 0, 3]
  diagram.positions = pairs.slice(0, instrument.string_count!).flatMap((frets, index) => frets.map((baseFret, j) => {
    const i = index * 2 + j
    const fret = fixture === 'open' ? openFrets[i]! : fixture === 'octave' ? baseFret + 7 : fixture === 'wide' && i === 11 ? 19 : baseFret
    const pitch = frettedPitch(instrument.tuning!, index + 1, fret)!
    const interval = INTERVALS[(pitch - NAMES.indexOf(diagram.root_note!) + 120) % 12]!
    return { position_id: `s${index + 1}-${j}`, string: index + 1, fret, interval, note_name: NAMES[pitch % 12]!, shape: shape === 'mixed' ? interval === 'R' ? 'star' as const : i % 2 === 0 ? 'square' as const : 'dot' as const : shape }
  }))
  diagram.regions = [{ region_id: 'position', fret_start: fixture === 'open' ? 0 : fixture === 'octave' ? 12 : 5, fret_end: fixture === 'open' ? 3 : fixture === 'octave' ? 15 : 8, string_start: 1, string_end: instrument.string_count, description: { en: fixture === 'captions' ? 'Find the root notes inside the first minor pentatonic position' : 'Position 1', pt_BR: 'Encontre as notas tônicas na região destacada' }, color: '#b79bff' }]
  if (fixture === 'captions') {
    diagram.regions.push({ ...diagram.regions[0]!, region_id: 'overlap', fret_start: 6, color: '#55cfb0', description: { en: 'Overlapping region · compare the upper voices', pt_BR: 'Região sobreposta · compare as vozes superiores' } })
    diagram.regions.push({ ...diagram.regions[0]!, region_id: 'stacked', color: '#f0bf70', description: { en: 'Same area · a second musical perspective', pt_BR: 'Mesma região · outra perspectiva musical' } })
  }
  const ordered = [...diagram.positions].sort((a, b) => frettedPitch(instrument.tuning!, a.string!, a.fret!)! - frettedPitch(instrument.tuning!, b.string!, b.fret!)!)
  diagram.sequence = sequence === 'none' ? [] : sequence === 'phrase' ? [
    { position_ids: ['s1-0'], value: { num: 1, den: 4 }, strum: 'none' },
    { position_ids: ['s1-1'], value: { num: 1, den: 8 }, strum: 'none' },
    { position_ids: [], value: { num: 1, den: 8 }, strum: 'none' },
    { position_ids: ['s1-0', 's2-0', 's3-1'], value: { num: 1, den: 2 }, strum: 'down' },
  ] : ordered.map(p => ({ position_ids: [p.position_id!], value: { num: 1, den: 4 }, strum: 'none' }))
  return { diagram, instrument }
}
