import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionFretboardCell from '@/features/student/components/SessionFretboardCell.vue'
import type { GradedCellAnswer } from '@/features/student/composables/usePracticeSessionRun'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'
const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function cell(string: number, fret: number, drill: 'name_the_note' | 'find_the_note'): Item {
  return {
    item_key: `fretboard_cell:${LAYOUT}:${string}:${fret}`,
    kind: 'fretboard_cell',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 8,
    fretboard_cell: { layout_instrument_id: LAYOUT, string, fret, drill },
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
    it('lights the cell and offers the twelve notes', () => {
      const wrapper = mountCell({ item: naming })

      expect(wrapper.get('[data-test="cell-prompt"]').text()).toBe('Name this note')
      const lit = wrapper.get('[data-test="lit-cell"]')
      expect([lit.attributes('data-string'), lit.attributes('data-fret')]).toEqual(['5', '3'])
      expect(wrapper.findAll('[data-test="note-choice"]').map((choice) => choice.text())).toEqual([
        'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B',
      ])
    })

    it('answers with the tap on a note', async () => {
      const wrapper = mountCell({ item: naming })

      await wrapper.findAll('[data-test="note-choice"]')[1]!.trigger('click')

      expect(wrapper.emitted('answer')).toEqual([[{ response_type: 'name_the_note', note_name: 'C#' }]])
    })

    it('answers with a letter key, and a sharp with Shift', () => {
      const wrapper = mountCell({ item: naming })

      press('c')
      press('F', { shiftKey: true })

      expect(wrapper.emitted('answer')).toEqual([
        [{ response_type: 'name_the_note', note_name: 'C' }],
        [{ response_type: 'name_the_note', note_name: 'F#' }],
      ])
    })

    it('reveals the right note next to a wrong one, and takes no other answer', async () => {
      const wrapper = mountCell({
        item: naming,
        answer: { answer: { response_type: 'name_the_note', note_name: 'D' }, correct: false },
      })

      const choices = wrapper.findAll('[data-test="note-choice"]')
      expect(choices[0]!.attributes('data-mark')).toBe('right')
      expect(choices[2]!.attributes('data-mark')).toBe('wrong')
      expect(choices.filter((choice) => choice.attributes('data-mark')).length).toBe(2)
      expect(choices.every((choice) => choice.attributes('disabled') !== undefined)).toBe(true)

      press('e')
      expect(wrapper.emitted('answer')).toBeUndefined()
    })
  })

  describe('find the note', () => {
    it('asks for the note on its string, and takes taps on that string only', async () => {
      const wrapper = mountCell({ item: finding })

      expect(wrapper.get('[data-test="cell-prompt"]').text()).toBe('Find F on string 6')
      expect(wrapper.get('[data-test="asked-string"]').attributes('data-string')).toBe('6')
      expect(wrapper.findAll('[data-test="drill-cell"]').every((target) => target.attributes('data-string') === '6')).toBe(true)
      expect(wrapper.find('[data-test="lit-cell"]').exists()).toBe(false)

      await wrapper.findAll('[data-test="drill-cell"]')[2]!.trigger('click')

      expect(wrapper.emitted('answer')).toEqual([[{ response_type: 'find_the_note', string: 6, fret: 2 }]])
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
