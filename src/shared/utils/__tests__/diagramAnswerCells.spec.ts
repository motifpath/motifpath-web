import { describe, expect, it } from 'vitest'

import { diagramStimulusOptions } from '@/shared/utils/diagramAnswerCells'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

const guitar = makeFrettedInstrument()

function cellsOf(options: ReturnType<typeof diagramStimulusOptions>) {
  return options.map((o) => `${o.fret_cell?.string}/${o.fret_cell?.fret}`)
}

describe('diagramStimulusOptions', () => {
  it('is one option per cell of the answer window, as the server derives them', () => {
    // Positions on frets 5..8: low = 4, high = 4 + max(9 - 4, 3) = 9, so frets 5..9.
    const options = diagramStimulusOptions(makeFrettedDiagram(), guitar, makeDiagramRef({ correct_position_ids: [] }))

    expect(options).toHaveLength(5 * 6)
    expect(cellsOf(options).slice(0, 7)).toEqual(['1/5', '2/5', '3/5', '4/5', '5/5', '6/5', '1/6'])
    expect(cellsOf(options).at(-1)).toBe('6/9')
  })

  it('includes the open strings when the window reaches the nut', () => {
    const openChord = makeFrettedDiagram({
      positions: [
        { position_id: 'e0', string: 6, fret: 0, interval: 'R', note_name: 'E', shape: 'dot', sequence_index: 0 },
        { position_id: 'e1', string: 5, fret: 2, interval: '5', note_name: 'B', shape: 'dot', sequence_index: 1 },
      ],
    })

    const options = diagramStimulusOptions(openChord, guitar, makeDiagramRef({ correct_position_ids: ['e0'] }))

    expect(options).toHaveLength(4 * 6)
    expect(cellsOf(options).slice(0, 6)).toEqual(['1/0', '2/0', '3/0', '4/0', '5/0', '6/0'])
  })

  it('marks correct only the cells holding a correct position, hidden or not', () => {
    const options = diagramStimulusOptions(
      makeFrettedDiagram(),
      guitar,
      makeDiagramRef({ correct_position_ids: ['p0', 'p5'], layers: { hidden_position_ids: ['p0'] } }),
    )

    const correct = options.filter((o) => o.is_correct)
    expect(correct.map((o) => o.diagram_position_id)).toEqual(['p0', 'p5'])
    expect(correct.map((o) => o.fret_cell)).toEqual([
      { string: 6, fret: 5 },
      { string: 4, fret: 7 },
    ])
    // An occupied but wrong cell still names its position; an empty one names none.
    expect(options.find((o) => o.fret_cell?.string === 6 && o.fret_cell.fret === 8)).toEqual(
      expect.objectContaining({ is_correct: false, diagram_position_id: 'p1' }),
    )
    expect(options.find((o) => o.fret_cell?.string === 1 && o.fret_cell.fret === 5)?.diagram_position_id).toBeUndefined()
  })

  it('widens the window to cover the diagram regions too', () => {
    const withRegion = makeFrettedDiagram({
      regions: [{ region_id: 'r0', fret_start: 5, fret_end: 12, description: { en: 'box' } }],
    })

    const options = diagramStimulusOptions(withRegion, guitar, makeDiagramRef({ correct_position_ids: [] }))

    // low = 4, high = 4 + max(13 - 4, 3) = 13.
    expect(cellsOf(options).at(-1)).toBe('6/13')
  })

  it('gives every cell a distinct id', () => {
    const options = diagramStimulusOptions(makeFrettedDiagram(), guitar, makeDiagramRef({ correct_position_ids: [] }))

    expect(new Set(options.map((o) => o.option_id)).size).toBe(options.length)
  })
})
