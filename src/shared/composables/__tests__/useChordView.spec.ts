import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetChordViewPreference, useChordView } from '@/shared/composables/useChordView'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

const general = makeFrettedDiagram()
const chord = makeFrettedDiagram({ purpose: 'chord_voicing', chord_voicing: makeVoicing('d-open', 'chord-d') })

describe('useChordView', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetChordViewPreference()
  })
  afterEach(() => window.localStorage.clear())

  it('opens a chord voicing as a chord box, any other diagram as a fretboard', () => {
    expect(useChordView(() => chord).view.value).toBe('box')
    expect(useChordView(() => general).view.value).toBe('neck')
  })

  it('offers the switch only on a diagram that can be drawn as a box', () => {
    expect(useChordView(() => chord).canSwitch.value).toBe(true)
    expect(useChordView(() => general).canSwitch.value).toBe(false)
  })

  it('remembers the student’s choice for the next chord, on this device', () => {
    useChordView(() => chord).choose('neck')

    expect(useChordView(() => chord).view.value).toBe('neck')
    expect(window.localStorage.getItem('motifpath.chordView')).toBe('neck')

    resetChordViewPreference()
    expect(useChordView(() => chord).view.value).toBe('neck')
  })

  it('never draws a diagram without a voicing as a box, whatever the choice', () => {
    useChordView(() => chord).choose('box')

    expect(useChordView(() => general).view.value).toBe('neck')
  })

  it('keeps working when storage is blocked', () => {
    const blocked = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    try {
      resetChordViewPreference()
      const chordView = useChordView(() => chord)
      expect(chordView.view.value).toBe('box')
      chordView.choose('neck')
      expect(chordView.view.value).toBe('neck')
    } finally {
      Object.defineProperty(window, 'localStorage', blocked)
    }
  })
})
