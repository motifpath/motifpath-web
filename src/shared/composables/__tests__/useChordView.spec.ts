import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { useChordView } from '@/shared/composables/useChordView'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

const general = makeFrettedDiagram()
const chord = makeFrettedDiagram({ purpose: 'chord_voicing', chord_voicing: makeVoicing('d-open', 'chord-d') })

describe('useChordView', () => {
  it('shows a diagram with chord data as a chord box', () => {
    expect(useChordView(() => chord).view.value).toBe('box')
  })

  it('shows a diagram without chord data on the fretboard', () => {
    expect(useChordView(() => general).view.value).toBe('neck')
    expect(useChordView(() => null).view.value).toBe('neck')
  })

  it('offers Box | Neck only on a chord box', () => {
    expect(useChordView(() => chord).canSwitch.value).toBe(true)
    expect(useChordView(() => general).canSwitch.value).toBe(false)
  })

  it('switches this showing only: another opens as a box', () => {
    const shown = useChordView(() => chord)

    shown.choose('neck')

    expect(shown.view.value).toBe('neck')
    expect(useChordView(() => chord).view.value).toBe('box')
  })

  it('opens the next chord as a box, whatever the student chose before', async () => {
    const diagram = ref(chord)
    const shown = useChordView(() => diagram.value)
    shown.choose('neck')

    diagram.value = makeFrettedDiagram({ diagram_id: 'another-chord', purpose: 'chord_voicing', chord_voicing: makeVoicing('g-open', 'chord-g') })
    await nextTick()

    expect(shown.view.value).toBe('box')
  })
})
