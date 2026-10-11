import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useChordView } from '@/shared/composables/useChordView'
import { makeDiagramRef, makeFrettedDiagram } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

type DiagramRef = components['schemas']['DiagramRef']

const general = makeFrettedDiagram()
const chord = makeFrettedDiagram({ purpose: 'chord_voicing', chord_voicing: makeVoicing('d-open', 'chord-d') })
const asBox = makeDiagramRef({ view: 'chord_box' })
const onNeck = makeDiagramRef({ view: 'fretboard' })
const unset = makeDiagramRef()

describe('useChordView', () => {
  it('shows a chord voicing as a chord box when its author chose one', () => {
    expect(useChordView(() => ({ diagram: chord, diagramRef: asBox })).view.value).toBe('box')
  })

  it('shows a diagram on the fretboard when its author chose that, or nothing', () => {
    expect(useChordView(() => ({ diagram: chord, diagramRef: onNeck })).view.value).toBe('neck')
    expect(useChordView(() => ({ diagram: chord, diagramRef: unset })).view.value).toBe('neck')
  })

  it('never draws a box without the voicing that gives it its fingering', () => {
    expect(useChordView(() => ({ diagram: general, diagramRef: asBox })).view.value).toBe('neck')
  })

  it('offers Box | Neck only on a chord box', () => {
    expect(useChordView(() => ({ diagram: chord, diagramRef: asBox })).canSwitch.value).toBe(true)
    expect(useChordView(() => ({ diagram: chord, diagramRef: onNeck })).canSwitch.value).toBe(false)
    expect(useChordView(() => ({ diagram: general, diagramRef: asBox })).canSwitch.value).toBe(false)
  })

  it('switches this showing only: another opens in its author’s view', () => {
    const shown = useChordView(() => ({ diagram: chord, diagramRef: asBox }))

    shown.choose('neck')

    expect(shown.view.value).toBe('neck')
    expect(useChordView(() => ({ diagram: chord, diagramRef: asBox })).view.value).toBe('box')
  })

  it('opens the next diagram in its author’s view, whatever the student chose before', async () => {
    const usage = ref<DiagramRef>(asBox)
    const shown = useChordView(() => ({ diagram: chord, diagramRef: usage.value }))
    shown.choose('neck')

    usage.value = makeDiagramRef({ diagram_id: 'another-chord', view: 'chord_box' })
    await nextTick()

    expect(shown.view.value).toBe('box')
  })
})
