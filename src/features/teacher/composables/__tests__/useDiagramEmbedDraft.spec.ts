import { describe, expect, it } from 'vitest'

import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

// A minor pentatonic: R, b3, 4, 5, b7 (R twice).
const penta = makeFrettedDiagram()
const other = makeFrettedDiagram({
  diagram_id: 'd-other',
  positions: [
    { position_id: 'o1', string: 5, fret: 3, interval: '5', note_name: 'G', shape: 'dot', sequence_index: null },
    { position_id: 'o2', string: 6, fret: 3, interval: 'R', note_name: 'C', shape: 'dot', sequence_index: null },
  ],
})

describe('useDiagramEmbedDraft', () => {
  it('starts with no diagram, so there is nothing to apply', () => {
    const draft = useDiagramEmbedDraft(null)

    expect(draft.diagram.value).toBeNull()
    expect(draft.canApply.value).toBe(false)
    expect(draft.toRef()).toBeNull()
  })

  it('offers the chosen diagram’s own intervals once each, in canonical order', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)

    expect(draft.availableIntervals.value).toEqual(['R', 'b3', '4', '5', 'b7'])
  })

  it('shows labels and every interval by default, written as a null subset', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)

    expect(draft.showLabels.value).toBe(true)
    expect(draft.selectedIntervals.value).toEqual(['R', 'b3', '4', '5', 'b7'])
    expect(draft.toRef()).toEqual({ diagram_id: penta.diagram_id, layers: { intervals: true, subset: null } })
  })

  it('writes a subset once some intervals are unchecked, in canonical order', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)
    draft.toggleInterval('b3')
    draft.toggleInterval('4')
    draft.toggleInterval('4')

    expect(draft.toRef()?.layers.subset).toEqual(['R', '4', '5', 'b7'])
  })

  it('cannot apply with every interval unchecked, since nothing would show', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(other)
    draft.toggleInterval('R')
    draft.toggleInterval('5')

    expect(draft.canApply.value).toBe(false)
    expect(draft.toRef()).toBeNull()
  })

  it('writes hidden labels', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)
    draft.toggleLabels()

    expect(draft.toRef()?.layers.intervals).toBe(false)
  })

  it('reopens an existing ref with its labels and subset once its diagram is loaded', () => {
    const initial: DiagramRef = { diagram_id: penta.diagram_id, layers: { intervals: false, subset: ['R', '5'] } }
    const draft = useDiagramEmbedDraft(initial)
    draft.select(penta)

    expect(draft.showLabels.value).toBe(false)
    expect(draft.selectedIntervals.value).toEqual(['R', '5'])
  })

  it('keeps the settings this picker doesn’t edit when the ref’s own diagram is kept', () => {
    const initial: DiagramRef = {
      diagram_id: penta.diagram_id,
      root_override: 'C',
      layers: { intervals: true, subset: null, shape_overlay: 'box' },
      styling: { root_color: '#ff0000', interval_color: null },
      playback: { direction: 'reversed', step_ms: 300 },
    }
    const draft = useDiagramEmbedDraft(initial)
    draft.select(penta)
    draft.toggleInterval('b7')

    expect(draft.toRef()).toEqual({
      ...initial,
      layers: { intervals: true, subset: ['R', 'b3', '4', '5'], shape_overlay: 'box' },
    })
  })

  it('starts fresh when a different diagram is chosen, dropping the old ref’s settings', () => {
    const initial: DiagramRef = {
      diagram_id: penta.diagram_id,
      layers: { intervals: false, subset: ['R'] },
      styling: { root_color: '#ff0000' },
    }
    const draft = useDiagramEmbedDraft(initial)
    draft.select(penta)
    draft.select(other)

    expect(draft.showLabels.value).toBe(true)
    expect(draft.toRef()).toEqual({ diagram_id: 'd-other', layers: { intervals: true, subset: null } })
  })

  it('drops subset entries the diagram no longer has', () => {
    const initial: DiagramRef = { diagram_id: other.diagram_id, layers: { intervals: true, subset: ['R', 'b3'] } }
    const draft = useDiagramEmbedDraft(initial)
    draft.select(other)

    expect(draft.selectedIntervals.value).toEqual(['R'])
  })

  describe('choosing answers, for an exercise stimulus', () => {
    it('offers the shown intervals as answers and writes the correct ones', () => {
      const draft = useDiagramEmbedDraft(null, { answers: true })
      draft.select(penta)
      draft.toggleInterval('4')
      draft.toggleCorrect('R')
      draft.toggleCorrect('b7')

      expect(draft.correctIntervals.value).toEqual(['R', 'b7'])
      expect(draft.toRef()).toEqual({
        diagram_id: penta.diagram_id,
        layers: { intervals: true, subset: ['R', 'b3', '5', 'b7'] },
        correct_intervals: ['R', 'b7'],
      })
    })

    it('cannot apply without a correct answer', () => {
      const draft = useDiagramEmbedDraft(null, { answers: true })
      draft.select(penta)

      expect(draft.canApply.value).toBe(false)
      expect(draft.toRef()).toBeNull()
    })

    it('drops an answer whose interval is no longer shown', () => {
      const draft = useDiagramEmbedDraft(null, { answers: true })
      draft.select(penta)
      draft.toggleCorrect('b3')
      draft.toggleCorrect('R')
      draft.toggleInterval('b3')

      expect(draft.correctIntervals.value).toEqual(['R'])
    })

    it('reopens a stimulus with its correct answers', () => {
      const initial: DiagramRef = { diagram_id: penta.diagram_id, layers: { intervals: false }, correct_intervals: ['5'] }
      const draft = useDiagramEmbedDraft(initial, { answers: true })
      draft.select(penta)

      expect(draft.correctIntervals.value).toEqual(['5'])
    })

    it('writes no answers outside answer mode, even from a reopened ref', () => {
      const initial: DiagramRef = { diagram_id: penta.diagram_id, layers: { intervals: true }, correct_intervals: ['5'] }
      const draft = useDiagramEmbedDraft(initial)
      draft.select(penta)

      expect(draft.toRef()).not.toHaveProperty('correct_intervals')
    })
  })
})
