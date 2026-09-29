import { computeFrettedDiagramLayout } from '@/shared/utils/frettedDiagramLayout'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']
type Option = components['schemas']['Option']

/**
 * The options a diagram stimulus will have once saved, worked out here so an
 * author can try an unsaved exercise: one per cell of the answer window
 * of the fretboard, correct where a correct position sits. The server derives the
 * stored options the same way on save; these ids are only for the preview.
 *
 * The window spans every position and region, hidden or not, since a hidden
 * position can be a correct answer — the one the viewer draws when it has
 * cells to show. Open strings are cells only
 * when it reaches the nut.
 */
export function diagramStimulusOptions(diagram: Diagram, instrument: Instrument, diagramRef: DiagramRef): Option[] {
  const { minFret, maxFret, stringCount } = computeFrettedDiagramLayout(diagram, instrument, diagramRef, {
    includeHidden: true,
  })
  const correct = new Set(diagramRef.correct_position_ids ?? [])
  const occupant = new Map<string, string>()
  for (const position of diagram.positions) {
    if (position.string !== undefined && position.fret !== undefined) {
      occupant.set(`${position.string}/${position.fret}`, position.position_id ?? '')
    }
  }

  const options: Option[] = []
  const firstFret = minFret === 0 ? 0 : minFret + 1
  for (let fret = firstFret; fret <= maxFret; fret++) {
    for (let string = 1; string <= stringCount; string++) {
      const positionId = occupant.get(`${string}/${fret}`)
      options.push({
        option_id: `preview-cell-${string}-${fret}`,
        is_correct: positionId !== undefined && correct.has(positionId),
        diagram_id: diagram.diagram_id,
        fret_cell: { string, fret },
        ...(positionId !== undefined ? { diagram_position_id: positionId } : {}),
      })
    }
  }
  return options
}
