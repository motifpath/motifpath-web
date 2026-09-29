import { describe, expect, it } from 'vitest'

import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import { makeFrettedDiagram, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

// A minor pentatonic: p0 R, p1 b3, p2 4, p3 5, p4 b7, p5 R.
const penta = makeFrettedDiagram()
const other = makeFrettedDiagram({ diagram_id: 'd-other' })
const playable = makeSequencedFrettedDiagram({ diagram_id: 'd-playable' })

describe('useDiagramEmbedDraft', () => {
  it('starts with no diagram, so there is nothing to apply', () => {
    const draft = useDiagramEmbedDraft(null)

    expect(draft.diagram.value).toBeNull()
    expect(draft.canApply.value).toBe(false)
    expect(draft.toRef()).toBeNull()
  })

  it('draws a fresh diagram as authored: custom labels over its own display, every position shown', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)

    expect(draft.label.value).toBe('custom')
    expect(draft.hiddenPositionIds.value).toEqual([])
    expect(draft.toRef()).toEqual({
      diagram_id: penta.diagram_id,
      layers: { label: 'custom', intervals: true, hidden_position_ids: null, subset: null },
    })
  })

  it('writes the chosen label mode, keeping the older switch in step for older readers', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)

    draft.setLabel('none')

    expect(draft.toRef()?.layers).toEqual(expect.objectContaining({ label: 'none', intervals: false }))
  })

  it('hides and shows single positions', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)

    draft.togglePosition('p1')
    draft.togglePosition('p4')
    draft.togglePosition('p1')

    expect(draft.toRef()?.layers.hidden_position_ids).toEqual(['p4'])
  })

  it('hides every position of an interval at once, and shows them again', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)

    expect(draft.availableIntervals.value).toEqual(['R', 'b3', '4', '5', 'b7'])
    draft.toggleIntervalVisibility('R')
    expect(draft.hiddenPositionIds.value).toEqual(['p0', 'p5'])
    expect(draft.intervalState('R')).toBe('hidden')

    draft.togglePosition('p5')
    expect(draft.intervalState('R')).toBe('mixed')

    draft.toggleIntervalVisibility('R')
    expect(draft.hiddenPositionIds.value).toEqual(['p0', 'p5'])
    draft.toggleIntervalVisibility('R')
    expect(draft.hiddenPositionIds.value).toEqual([])
    expect(draft.intervalState('R')).toBe('shown')
  })

  it('cannot embed a diagram with every position hidden, since nothing would show', () => {
    const draft = useDiagramEmbedDraft(null)
    draft.select(penta)
    for (const code of draft.availableIntervals.value) draft.toggleIntervalVisibility(code)

    expect(draft.canApply.value).toBe(false)
    expect(draft.toRef()).toBeNull()
    expect(draft.toPreviewRef()?.layers.hidden_position_ids).toHaveLength(6)
  })

  it('reopens a ref with its label, hidden positions and the settings it doesn’t edit', () => {
    const initial: DiagramRef = {
      diagram_id: penta.diagram_id,
      root_override: 'C',
      layers: { label: 'note', hidden_position_ids: ['p2'], shape_overlay: 'box' },
      styling: { root_color: '#ff0000' },
    }
    const draft = useDiagramEmbedDraft(initial)
    draft.select(penta)

    expect(draft.label.value).toBe('note')
    expect(draft.toRef()).toEqual({
      ...initial,
      layers: { label: 'note', intervals: true, hidden_position_ids: ['p2'], subset: null, shape_overlay: 'box' },
    })
  })

  it('reopens an older ref: its label switch and interval subset become a label mode and hidden positions', () => {
    const initial: DiagramRef = { diagram_id: penta.diagram_id, layers: { intervals: false, subset: ['R', '5'] } }
    const draft = useDiagramEmbedDraft(initial)
    draft.select(penta)

    expect(draft.label.value).toBe('none')
    expect(draft.hiddenPositionIds.value).toEqual(['p1', 'p2', 'p4'])
    expect(draft.toRef()?.layers.subset).toBeNull()
  })

  it('starts fresh when a different diagram is chosen', () => {
    const draft = useDiagramEmbedDraft({ diagram_id: penta.diagram_id, layers: { label: 'none', hidden_position_ids: ['p0'] } })
    draft.select(penta)
    draft.select(other)

    expect(draft.label.value).toBe('custom')
    expect(draft.hiddenPositionIds.value).toEqual([])
  })

  describe('playback', () => {
    it('offers Play on a fresh ref to a diagram with a sequence, as authored and once through', () => {
      const draft = useDiagramEmbedDraft(null)
      draft.select(playable)

      expect(draft.canConfigurePlayback.value).toBe(true)
      expect(draft.playbackOffered.value).toBe(true)
      expect(draft.toRef()?.playback).toEqual({ tempo_bpm: null, voice_id: null, direction: 'as_authored', loop: false })
    })

    it('leaves playback alone for a diagram without a sequence, since it never plays', () => {
      const draft = useDiagramEmbedDraft(null)
      draft.select(penta)

      expect(draft.canConfigurePlayback.value).toBe(false)
      expect(draft.toRef()).not.toHaveProperty('playback')

      const reopened = useDiagramEmbedDraft({ diagram_id: penta.diagram_id, layers: {}, playback: { direction: 'reversed', loop: true } })
      reopened.select(penta)
      expect(reopened.toRef()?.playback).toEqual({ direction: 'reversed', loop: true })
    })

    it('has no playback settings where the diagram is only ever a still picture, keeping what the ref had', () => {
      const draft = useDiagramEmbedDraft(null, { playable: false })
      draft.select(playable)

      expect(draft.canConfigurePlayback.value).toBe(false)
      expect(draft.toRef()).not.toHaveProperty('playback')

      const reopened = useDiagramEmbedDraft(
        { diagram_id: playable.diagram_id, layers: {}, playback: { direction: 'reversed', loop: true } },
        { playable: false },
      )
      reopened.select(playable)
      expect(reopened.toRef()?.playback).toEqual({ direction: 'reversed', loop: true })
    })

    it('writes no playback once Play is no longer offered', () => {
      const draft = useDiagramEmbedDraft(null)
      draft.select(playable)

      draft.setPlaybackOffered(false)

      expect(draft.toRef()?.playback).toBeNull()
    })

    it('writes the tempo, voice, direction and loop the teacher picks', () => {
      const draft = useDiagramEmbedDraft(null)
      draft.select(playable)

      draft.setPlaybackTempo(120)
      draft.setPlaybackVoice('piano')
      draft.setPlaybackDirection('reversed')
      draft.setPlaybackLoop(true)

      expect(draft.toRef()?.playback).toEqual({ tempo_bpm: 120, voice_id: 'piano', direction: 'reversed', loop: true })

      draft.setPlaybackTempo(null)
      draft.setPlaybackVoice(null)
      expect(draft.toRef()?.playback).toEqual(expect.objectContaining({ tempo_bpm: null, voice_id: null }))
    })

    it('cannot apply a tempo outside 20–300 BPM, though the preview still plays it', () => {
      const draft = useDiagramEmbedDraft(null)
      draft.select(playable)

      draft.setPlaybackTempo(301)
      expect(draft.playbackTempoInvalid.value).toBe(true)
      expect(draft.canApply.value).toBe(false)
      expect(draft.toRef()).toBeNull()

      draft.setPlaybackOffered(false)
      expect(draft.canApply.value).toBe(true)
    })

    it('reopens a ref with its playback, and an older one without loop, tempo or voice', () => {
      const draft = useDiagramEmbedDraft({
        diagram_id: playable.diagram_id,
        layers: {},
        playback: { tempo_bpm: 60, voice_id: 'piano', direction: 'reversed', loop: true },
      })
      draft.select(playable)
      expect(draft.toRef()?.playback).toEqual({ tempo_bpm: 60, voice_id: 'piano', direction: 'reversed', loop: true })

      // Written before loop existed: only a direction.
      const older = useDiagramEmbedDraft({
        diagram_id: playable.diagram_id,
        layers: {},
        playback: { direction: 'reversed' } as DiagramRef['playback'],
      })
      older.select(playable)
      expect(older.toRef()?.playback).toEqual({ tempo_bpm: null, voice_id: null, direction: 'reversed', loop: false })
    })

    it('keeps Play off when reopening a ref that offered none', () => {
      const draft = useDiagramEmbedDraft({ diagram_id: playable.diagram_id, layers: {}, playback: null })
      draft.select(playable)

      expect(draft.playbackOffered.value).toBe(false)
      expect(draft.toRef()?.playback).toBeNull()
    })

    it('starts a different diagram with fresh playback settings', () => {
      const draft = useDiagramEmbedDraft({
        diagram_id: playable.diagram_id,
        layers: {},
        playback: { tempo_bpm: 60, voice_id: 'piano', direction: 'reversed', loop: true },
      })
      draft.select(playable)
      draft.select(makeSequencedFrettedDiagram({ diagram_id: 'd-other-playable' }))

      expect(draft.toRef()?.playback).toEqual({ tempo_bpm: null, voice_id: null, direction: 'as_authored', loop: false })
    })
  })

  describe('as an exercise stimulus', () => {
    it('marks correct positions one by one, and writes them', () => {
      const draft = useDiagramEmbedDraft(null, { answers: true })
      draft.select(penta)

      draft.togglePositionCorrect('p0')
      draft.togglePositionCorrect('p5')
      draft.togglePositionCorrect('p0')

      expect(draft.correctPositionIds.value).toEqual(['p5'])
      expect(draft.toRef()?.correct_position_ids).toEqual(['p5'])
    })

    it('cannot apply without a correct position', () => {
      const draft = useDiagramEmbedDraft(null, { answers: true })
      draft.select(penta)

      expect(draft.canShow.value).toBe(true)
      expect(draft.canApply.value).toBe(false)
      expect(draft.toRef()).toBeNull()
      expect(draft.toPreviewRef()).not.toBeNull()
    })

    it('lets a correct position be hidden, even every position, since the student finds it on the fretboard', () => {
      const draft = useDiagramEmbedDraft(null, { answers: true })
      draft.select(penta)
      draft.togglePositionCorrect('p0')
      for (const code of draft.availableIntervals.value) draft.toggleIntervalVisibility(code)

      expect(draft.canApply.value).toBe(true)
      expect(draft.toRef()?.correct_position_ids).toEqual(['p0'])
      expect(draft.toRef()?.layers.hidden_position_ids).toHaveLength(6)
    })

    it('reopens a stimulus with its correct positions, converting older correct intervals', () => {
      const byPosition = useDiagramEmbedDraft({ diagram_id: penta.diagram_id, layers: {}, correct_position_ids: ['p3'] }, { answers: true })
      byPosition.select(penta)
      expect(byPosition.correctPositionIds.value).toEqual(['p3'])

      const byInterval = useDiagramEmbedDraft(
        { diagram_id: penta.diagram_id, layers: { intervals: true, subset: ['R', 'b3'] }, correct_intervals: ['R'] },
        { answers: true },
      )
      byInterval.select(penta)
      expect(byInterval.correctPositionIds.value).toEqual(['p0', 'p5'])
      expect(byInterval.toRef()).not.toHaveProperty('correct_intervals')
    })

    it('writes no answers outside answer mode, even from a reopened ref', () => {
      const draft = useDiagramEmbedDraft({ diagram_id: penta.diagram_id, layers: {}, correct_position_ids: ['p3'], correct_intervals: ['R'] })
      draft.select(penta)

      expect(draft.toRef()).not.toHaveProperty('correct_position_ids')
      expect(draft.toRef()).not.toHaveProperty('correct_intervals')
    })
  })
})
