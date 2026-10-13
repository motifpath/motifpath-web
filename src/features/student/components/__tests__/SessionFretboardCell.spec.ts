import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionFretboardCell from '@/features/student/components/SessionFretboardCell.vue'
import type { GradedCellAnswer } from '@/features/student/composables/usePracticeSessionRun'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'
const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

type FromFret = NonNullable<Item['fretboard_cell']>['fret_window']['from_fret']

function cell(string: number, fret: number, drill: 'name_the_note' | 'find_the_note', fromFret: FromFret = 0): Item {
  return {
    item_key: `fretboard_cell:${LAYOUT}:${string}:${fret}`,
    kind: 'fretboard_cell',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 8,
    fretboard_cell: { layout_instrument_id: LAYOUT, string, fret, drill, fret_window: { from_fret: fromFret } },
  }
}

const naming = cell(5, 3, 'name_the_note')
const finding = cell(6, 1, 'find_the_note')

let reducedMotion = false
function stubMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function mountCell(props: { item: Item; answer?: GradedCellAnswer | null; instrumentName?: string }) {
  return mount(SessionFretboardCell, { props: { tuning: STANDARD, answer: null, ...props }, attachTo: document.body })
}

function press(key: string, init: KeyboardEventInit = {}) {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

function marks(wrapper: ReturnType<typeof mountCell>, selector: string) {
  return wrapper.findAll(selector).map((element) => `${element.attributes('data-test')}=${element.attributes('data-mark')}`)
}

enableAutoUnmount(afterEach)

describe('SessionFretboardCell', () => {
  beforeEach(() => {
    reducedMotion = false
    stubMatchMedia()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('gives the drill board the room of a wider screen, where the whole neck fits at tap size', () => {
    const breakout = mountCell({ item: naming }).get('[data-test="breakout"]')

    expect(breakout.findComponent({ name: 'DrillFretboard' }).exists()).toBe(true)
  })

  it('names the instrument the cell is on, when the session mixes instruments', () => {
    expect(mountCell({ item: naming, instrumentName: 'Electric bass' }).get('[data-test="item-instrument"]').text()).toBe('Electric bass')
  })

  it('names no instrument when the session has one', () => {
    expect(mountCell({ item: naming }).find('[data-test="item-instrument"]').exists()).toBe(false)
  })

  it('shows why the cell was picked', () => {
    expect(mountCell({ item: naming }).get('[data-test="item-reason"]').text()).toBe('New')
  })

  describe('name the note', () => {
    // A random source near 1 leaves the choices unshuffled: the note, a semitone below, a semitone
    // above, the neighbouring string.
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
    })

    const choiceTexts = (wrapper: ReturnType<typeof mountCell>) =>
      wrapper.findAll('[data-test="note-choice"]').map((choice) => `${choice.get('[data-test="key-hint"]').text()}${choice.get('[data-test="option-label"]').text()}`)

    it('lights the cell and offers four near notes, each with its key', () => {
      const wrapper = mountCell({ item: naming })

      expect(wrapper.get('h2[data-test="item-title"]').text()).toBe('Name this note')
      const lit = wrapper.get('[data-test="lit-cell"]')
      expect([lit.attributes('data-string'), lit.attributes('data-fret')]).toEqual(['5', '3'])
      expect(choiceTexts(wrapper)).toEqual(['1C', '2B', '3C♯', '4F'])
    })

    it('answers with the tap on a note, sending the four choices as shown', async () => {
      const wrapper = mountCell({ item: naming })

      await wrapper.findAll('[data-test="note-choice"]')[2]!.trigger('click')

      expect(wrapper.emitted('answer')).toEqual([[{ response_type: 'name_the_note', note_name: 'C#', choices: ['C', 'B', 'C#', 'F'] }]])
    })

    it('answers with the number key of a choice', () => {
      const wrapper = mountCell({ item: naming })

      press('4')

      expect(wrapper.emitted('answer')).toEqual([[{ response_type: 'name_the_note', note_name: 'F', choices: ['C', 'B', 'C#', 'F'] }]])
    })

    it('ignores a number key with no choice behind it', () => {
      const wrapper = mountCell({ item: naming })

      press('5')

      expect(wrapper.emitted('answer')).toBeUndefined()
    })

    it('keeps its choices in the order first shown once answered', () => {
      const wrapper = mountCell({ item: naming })
      vi.spyOn(Math, 'random').mockReturnValue(0)

      wrapper.setProps({ answer: { answer: { response_type: 'name_the_note', note_name: 'C', choices: ['C', 'B', 'C#', 'F'] }, correct: true } })

      return wrapper.vm.$nextTick().then(() => expect(choiceTexts(wrapper)).toEqual(['1C', '2B', '3C♯', '4F']))
    })

    it('reveals the right note next to a wrong one, and takes no other answer', () => {
      const wrapper = mountCell({
        item: naming,
        answer: { answer: { response_type: 'name_the_note', note_name: 'B', choices: ['C', 'B', 'C#', 'F'] }, correct: false },
      })

      const choices = wrapper.findAll('[data-test="note-choice"]')
      expect(choices.map((choice) => choice.attributes('data-mark'))).toEqual(['right', 'wrong', undefined, undefined])
      expect(choices.map((choice) => choice.attributes('data-state'))).toEqual(['right', 'wrong', 'locked', 'locked'])
      expect(choices.every((choice) => choice.attributes('disabled') !== undefined)).toBe(true)

      press('3')
      expect(wrapper.emitted('answer')).toBeUndefined()
    })
  })

  describe('name the note in a fret window', () => {
    it('draws only the window, with its cell lit', () => {
      const wrapper = mountCell({ item: cell(4, 9, 'name_the_note', 7) })

      expect(wrapper.findAll('[data-test="fret-number"]').map((n) => n.text())).toEqual(['7', '8', '9', '10', '11'])
      const lit = wrapper.get('[data-test="lit-cell"]')
      expect(`${lit.attributes('data-string')}:${lit.attributes('data-fret')}`).toBe('4:9')
    })
  })

  describe('find the note', () => {
    it('asks for the note on its string, and takes taps on that string only', async () => {
      const wrapper = mountCell({ item: finding })

      expect(wrapper.get('h2[data-test="item-title"]').text()).toBe('Find F on string 6, frets 0–5')
      expect(wrapper.get('[data-test="asked-string"]').attributes('data-string')).toBe('6')
      expect(wrapper.findAll('[data-test="drill-cell"]').every((target) => target.attributes('data-string') === '6')).toBe(true)
      expect(wrapper.find('[data-test="lit-cell"]').exists()).toBe(false)

      await wrapper.findAll('[data-test="drill-cell"]')[2]!.trigger('click')

      expect(wrapper.emitted('answer')).toEqual([[{ response_type: 'find_the_note', string: 6, fret: 2 }]])
    })

    it('names its fret window and takes taps only in it', async () => {
      const wrapper = mountCell({ item: cell(5, 3, 'find_the_note', 3) })

      expect(wrapper.get('h2[data-test="item-title"]').text()).toBe('Find C on string 5, frets 3–7')
      expect(wrapper.findAll('[data-test="drill-cell"]').map((target) => target.attributes('data-fret'))).toEqual(['3', '4', '5', '6', '7'])

      await wrapper.findAll('[data-test="drill-cell"]')[0]!.trigger('click')
      expect(wrapper.emitted('answer')).toEqual([[{ response_type: 'find_the_note', string: 5, fret: 3 }]])
    })

    it('marks a wrong tap and reveals where the note is', () => {
      const wrapper = mountCell({
        item: finding,
        answer: { answer: { response_type: 'find_the_note', string: 6, fret: 2 }, correct: false },
      })

      const placed = wrapper.findAll('[data-test="cell-mark"]').map((mark) => `${mark.attributes('data-string')}:${mark.attributes('data-fret')}`)
      expect(placed).toEqual(['6:2', '6:1'])
      expect(marks(wrapper, '[data-test="diagram-mark"]')).toEqual(['diagram-mark=wrong', 'diagram-mark=right'])
    })

    it('marks only the tap when it is right', () => {
      const wrapper = mountCell({
        item: finding,
        answer: { answer: { response_type: 'find_the_note', string: 6, fret: 1 }, correct: true },
      })

      expect(marks(wrapper, '[data-test="diagram-mark"]')).toEqual(['diagram-mark=right'])
    })
  })

  describe('feedback', () => {
    it('says a right answer is right, then moves on by itself after a moment', () => {
      const wrapper = mountCell({ item: naming, answer: { answer: { response_type: 'name_the_note', note_name: 'C' }, correct: true } })

      expect(wrapper.get('[data-test="answer-feedback"]').text()).toBe('Right!')
      vi.advanceTimersByTime(899)
      expect(wrapper.emitted('next')).toBeUndefined()
      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('next')).toEqual([[]])
    })

    it('waits for Continue after a wrong answer', async () => {
      const wrapper = mountCell({ item: naming, answer: { answer: { response_type: 'name_the_note', note_name: 'D' }, correct: false } })

      expect(wrapper.get('[data-test="answer-feedback"]').text()).toBe('Not quite.')
      vi.advanceTimersByTime(5000)
      expect(wrapper.emitted('next')).toBeUndefined()

      await wrapper.get('[data-test="action-bar"] [data-test="next-item"]').trigger('click')
      expect(wrapper.emitted('next')).toEqual([[]])
    })

    it('waits for Continue when the student asks for reduced motion', () => {
      reducedMotion = true
      const wrapper = mountCell({ item: naming, answer: { answer: { response_type: 'name_the_note', note_name: 'C' }, correct: true } })

      vi.advanceTimersByTime(5000)

      expect(wrapper.emitted('next')).toBeUndefined()
    })
  })
})
