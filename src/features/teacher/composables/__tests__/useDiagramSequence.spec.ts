import { describe, expect, it } from 'vitest'

import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useDiagramSequence } from '@/features/teacher/composables/useDiagramSequence'
import { makeFrettedDiagram, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function setup(diagram = makeFrettedDiagram()) {
  const form = useDiagramForm()
  form.loadFromDiagram(diagram)
  form.tuning.value = STANDARD
  return { form, sequence: useDiagramSequence(form) }
}

const ids = (form: ReturnType<typeof useDiagramForm>) => form.sequence.value.map((step) => step.position_ids)
const values = (form: ReturnType<typeof useDiagramForm>) => form.sequence.value.map((step) => step.value)

describe('useDiagramSequence', () => {
  it('starts on eighth notes, with nothing selected, not recording', () => {
    const { sequence } = setup()

    expect(sequence.currentValue.value).toEqual({ num: 1, den: 8 })
    expect(sequence.selectedIndex.value).toBeNull()
    expect(sequence.recording.value).toBe(false)
  })

  describe('adding steps', () => {
    it('while recording, adds each picked position as a new step of the value picked before it, and selects it', () => {
      const { form, sequence } = setup()
      sequence.recording.value = true

      sequence.pickPosition('p0')
      sequence.setBase(4)
      sequence.pickPosition('p1')

      expect(ids(form)).toEqual([['p0'], ['p1']])
      expect(values(form)).toEqual([{ num: 1, den: 8 }, { num: 1, den: 4 }])
      expect(sequence.selectedIndex.value).toBe(1)
    })

    it('gives the diagram a 90 BPM tempo with its first note', () => {
      const { form, sequence } = setup()

      sequence.pickPosition('p0')

      expect(form.tempoBpm.value).toBe(90)
    })

    it('keeps a tempo the diagram already has', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram({ tempo_bpm: 120 }))

      sequence.pickPosition('p5')

      expect(form.tempoBpm.value).toBe(120)
    })

    it('inserts a new step right after the selected one', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram())

      sequence.selectStep(0)
      sequence.pickPosition('p5')

      expect(ids(form)).toEqual([['p0'], ['p5'], ['p1'], [], ['p0', 'p2', 'p3']])
      expect(sequence.selectedIndex.value).toBe(1)
    })

    it('adds a picked position to the selected step as a chord, and takes it out again', () => {
      const { form, sequence } = setup()
      sequence.pickPosition('p0')
      sequence.chord.value = true

      sequence.pickPosition('p2')
      sequence.pickPosition('p3')
      expect(ids(form)).toEqual([['p0', 'p2', 'p3']])

      sequence.pickPosition('p2')
      expect(ids(form)).toEqual([['p0', 'p3']])
    })

    it('adds a rest of the current value after the selected step', () => {
      const { form, sequence } = setup()
      sequence.pickPosition('p0')
      sequence.setBase(4)

      sequence.addRest()

      expect(form.sequence.value[1]).toEqual({ position_ids: [], value: { num: 1, den: 4 }, strum: 'none' })
      expect(sequence.selectedIndex.value).toBe(1)
    })

    it('fills an empty sequence with every position once, lowest pitch first', () => {
      const { form, sequence } = setup()
      sequence.setBase(16)

      sequence.fillFromPositions()

      // p0 A2, p1 C3, p2 D3, p3 E3, p4 G3, p5 A3
      expect(ids(form)).toEqual([['p0'], ['p1'], ['p2'], ['p3'], ['p4'], ['p5']])
      expect(values(form).every((v) => v.num === 1 && v.den === 16)).toBe(true)
      expect(form.tempoBpm.value).toBe(90)
    })

    it('fills by pitch, not by the order the positions were placed', () => {
      const diagram = makeFrettedDiagram()
      const { form, sequence } = setup({ ...diagram, positions: [...diagram.positions].reverse() })

      sequence.fillFromPositions()

      expect(ids(form).flat()).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5'])
    })
  })

  describe('note values', () => {
    it('builds dotted notes and triplets, one modifier at a time', () => {
      const { sequence } = setup()
      sequence.setBase(4)

      sequence.toggleDotted()
      expect(sequence.currentValue.value).toEqual({ num: 3, den: 8 })

      sequence.setTuplet(3)
      expect(sequence.dotted.value).toBe(false)
      expect(sequence.currentValue.value).toEqual({ num: 1, den: 6 })

      sequence.toggleDotted()
      expect(sequence.tuplet.value).toBeNull()
      expect(sequence.currentValue.value).toEqual({ num: 3, den: 8 })
    })

    it('changes the selected step to the value picked', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram())
      sequence.selectStep(3)

      sequence.setBase(2)
      sequence.toggleDotted()

      expect(form.sequence.value[3]?.value).toEqual({ num: 3, den: 4 })
    })

    it('shows a selected step’s own value on the palette', () => {
      const { sequence } = setup(
        makeSequencedFrettedDiagram({
          sequence: [{ position_ids: ['p0'], value: { num: 1, den: 12 }, strum: 'none' }],
        }),
      )

      sequence.selectStep(0)

      expect(sequence.base.value).toBe(8)
      expect(sequence.tuplet.value).toBe(3)
      expect(sequence.dotted.value).toBe(false)
    })
  })

  describe('editing steps', () => {
    it('selects a step, and unselects it when picked again', () => {
      const { sequence } = setup(makeSequencedFrettedDiagram())

      sequence.selectStep(3)
      expect(sequence.selectedPositionIds.value).toEqual(['p0', 'p2', 'p3'])

      sequence.selectStep(3)
      expect(sequence.selectedIndex.value).toBeNull()
      expect(sequence.selectedPositionIds.value).toEqual([])
    })

    it('sets how a chord is strummed', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram())

      sequence.setStrum(3, 'up')

      expect(form.sequence.value[3]?.strum).toBe('up')
    })

    it('moves a step earlier or later, keeping it selected', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram())
      sequence.selectStep(1)

      sequence.moveStep(1, -1)
      expect(ids(form)).toEqual([['p1'], ['p0'], [], ['p0', 'p2', 'p3']])
      expect(sequence.selectedIndex.value).toBe(0)

      sequence.moveStep(0, -1)
      expect(ids(form)[0]).toEqual(['p1'])
    })

    it('removes a step, and clears the tempo with the last note', () => {
      const { form, sequence } = setup(
        makeSequencedFrettedDiagram({
          sequence: [{ position_ids: ['p0'], value: { num: 1, den: 4 }, strum: 'none' }],
        }),
      )
      sequence.selectStep(0)

      sequence.removeStep(0)

      expect(form.sequence.value).toEqual([])
      expect(form.tempoBpm.value).toBeNull()
      expect(sequence.selectedIndex.value).toBeNull()
    })

    it('clears the whole sequence', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram())

      sequence.clear()

      expect(form.sequence.value).toEqual([])
      expect(form.tempoBpm.value).toBeNull()
    })

    it('keeps the tempo a whole number within 20–300 BPM', () => {
      const { form, sequence } = setup(makeSequencedFrettedDiagram())

      sequence.setTempo(12)
      expect(form.tempoBpm.value).toBe(20)
      sequence.setTempo(999)
      expect(form.tempoBpm.value).toBe(300)
      sequence.setTempo(72.6)
      expect(form.tempoBpm.value).toBe(73)
    })

    it('sets the time signature and the mode', () => {
      const { form, sequence } = setup()

      sequence.setTimeSignature({ beats: 7, beat_value: 8 })
      sequence.setMode('lydian')

      expect(form.timeSignature.value).toEqual({ beats: 7, beat_value: 8 })
      expect(form.mode.value).toBe('lydian')
    })

    it('turns recording and chords on and off, leaving chords off once recording stops', () => {
      const { sequence } = setup()

      sequence.toggleRecording()
      sequence.toggleChord()
      expect(sequence.recording.value).toBe(true)
      expect(sequence.chord.value).toBe(true)

      sequence.toggleRecording()
      expect(sequence.recording.value).toBe(false)
      expect(sequence.chord.value).toBe(false)
    })

    it('has no tempo to set while nothing plays', () => {
      const { form, sequence } = setup()

      sequence.setTempo(120)

      expect(form.tempoBpm.value).toBeNull()
    })
  })
})
