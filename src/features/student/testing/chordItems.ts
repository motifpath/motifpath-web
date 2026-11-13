import { http, HttpResponse, type HttpHandler } from 'msw'

import type { components } from '@/api/generated/core-domain'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import { endpoints } from '@/shared/testUtils/msw/handlers'

type Item = components['schemas']['PracticeSessionItem']
type Take = components['schemas']['ChangeTake']

/** The drill voicings' diagrams, each carrying its voicing, as the core API serves them. */
export const chordDiagramHandler: HttpHandler = http.get(endpoints.diagram, ({ params }) => {
  const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === params.diagram_id)
  return found ? HttpResponse.json({ ...found.diagram, chord_voicing: found.voicing }) : HttpResponse.json({ message: 'Diagram not found' }, { status: 404 })
})

/** The guitar the voicings are on, and the bass. */
export const chordInstrumentsHandler: HttpHandler = http.get(endpoints.instruments, () => HttpResponse.json([drillGuitar, drillBass]))

export const BASS_TUNING = drillBass.tuning ?? []

const base = { reason: 'new', node_id: null, level: 'new' } as const

export function changeTake(fields: Partial<Take> = {}): Take {
  return { cycles: 10, start_tempo_bpm: 45, target_tempo_bpm: 60, best_clean_tempo_bpm: 50, ...fields }
}

export function chordVoicingItem(symbol: keyof typeof drillVoicings): Item {
  const diagramId = drillVoicings[symbol].diagram.diagram_id
  return { ...base, item_key: `chord_voicing:${diagramId}`, kind: 'chord_voicing', rung: 'play_clean', estimated_seconds: 20, chord_voicing: { diagram_id: diagramId, chord_symbol: symbol } }
}

export function chordChangeItem(from: keyof typeof drillVoicings, to: keyof typeof drillVoicings, take: Take = changeTake()): Item {
  const [fromId, toId] = [drillVoicings[from].diagram.diagram_id, drillVoicings[to].diagram.diagram_id]
  return {
    ...base,
    item_key: `chord_change:${fromId}:${toId}`,
    kind: 'chord_change',
    rung: 'play_in_time',
    estimated_seconds: 90,
    chord_change: { from_diagram_id: fromId, to_diagram_id: toId, from_chord_symbol: from, to_chord_symbol: to, take },
  }
}

/**
 * G in the window from the third fret: its root on the low E string's third fret and its fifth above
 * on the A string's fifth; its fifth below is lower than the bass goes.
 */
export function rootFifthItem(): Item {
  return {
    ...base,
    item_key: `root_fifth:${drillBass.instrument_id}:G`,
    kind: 'root_fifth',
    rung: 'play_clean',
    estimated_seconds: 20,
    root_fifth: {
      layout_instrument_id: drillBass.instrument_id,
      chord_symbol: 'G',
      root: { string: 4, fret: 3 },
      fifth: { string: 3, fret: 5 },
      fifth_below: null,
      window_start_fret: 3,
      start_tempo_bpm: 60,
    },
  }
}

/** Am's root on the open A string and C's on its third fret, in the window from the nut. */
export function rootChangeItem(take: Take = changeTake()): Item {
  return {
    ...base,
    item_key: `root_change:${drillBass.instrument_id}:Am:C`,
    kind: 'root_change',
    rung: 'play_in_time',
    estimated_seconds: 90,
    root_change: {
      layout_instrument_id: drillBass.instrument_id,
      from_chord_symbol: 'Am',
      to_chord_symbol: 'C',
      from_root: { string: 3, fret: 0 },
      to_root: { string: 3, fret: 3 },
      window_start_fret: 0,
      take,
    },
  }
}
