import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FeltQuestions from '@/features/student/components/FeltQuestions.vue'

function mountQuestions(questions: string[], ratings: { drill_template_key: string; felt: 'easy' | 'about_right' | 'hard' }[] = []) {
  return mount(FeltQuestions, { props: { questions, ratings } })
}

describe('FeltQuestions', () => {
  it('asks how each drill felt, by what the student did', () => {
    const wrapper = mountQuestions(['fretboard_cell:find_the_note', 'exercise:text_response'])

    expect(wrapper.get('h2').text()).toBe('How did it feel?')
    expect(wrapper.findAll('[data-test="felt-question"] legend').map((legend) => legend.text())).toEqual([
      'Finding notes on the fretboard',
      'Answering questions',
    ])
    expect(wrapper.findAll('[data-test="felt-question"]')[0]!.findAll('button').map((button) => button.text())).toEqual(['Easy', 'About right', 'Hard'])
  })

  it('names a drill it has no words for plainly', () => {
    expect(mountQuestions(['chord_change:switch']).get('legend').text()).toBe('This drill')
  })

  it('answers a question with one tap', async () => {
    const wrapper = mountQuestions(['fretboard_cell:name_the_note'])

    await wrapper.findAll('button[data-felt]').find((button) => button.attributes('data-felt') === 'hard')!.trigger('click')

    expect(wrapper.emitted('rate')).toEqual([['fretboard_cell:name_the_note', 'hard']])
  })

  it('shows the answer given', () => {
    const wrapper = mountQuestions(['fretboard_cell:name_the_note', 'fretboard_cell:find_the_note'], [
      { drill_template_key: 'fretboard_cell:name_the_note', felt: 'easy' },
    ])

    expect(wrapper.findAll('button[aria-pressed="true"]').map((button) => button.attributes('data-felt'))).toEqual(['easy'])
  })

  it('can be skipped', async () => {
    const wrapper = mountQuestions(['fretboard_cell:name_the_note'])

    await wrapper.get('[data-test="action-bar"] [data-test="skip-felt"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([[]])
  })
})
