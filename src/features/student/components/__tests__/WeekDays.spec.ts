import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import WeekDays from '@/features/student/components/WeekDays.vue'
import { i18n } from '@/i18n'

afterEach(() => {
  i18n.global.locale.value = 'en'
})

// Thursday 2026-10-08 to Wednesday 2026-10-14, today.
const week = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']
const days = (marked: number[]) => week.map((date, index) => ({ date, marked: marked.includes(index) }))

function mountDays(marked: number[]) {
  return mount(WeekDays, { props: { label: 'Practice days', markedLabel: 'practised', days: days(marked) } })
}

describe('WeekDays', () => {
  it('says how many of the 7 days something happened', () => {
    const wrapper = mountDays([0, 2, 6])

    expect(wrapper.get('[data-test="week-days-label"]').text()).toBe('Practice days · 3 of 7')
  })

  it('shows the 7 days by weekday initial, oldest first and today last', () => {
    const wrapper = mountDays([])

    expect(wrapper.findAll('[data-test="week-day-letter"]').map((letter) => letter.text())).toEqual(['T', 'F', 'S', 'S', 'M', 'T', 'W'])
  })

  it('fills the days something happened', () => {
    const wrapper = mountDays([0, 2, 6])

    expect(wrapper.findAll('[data-test="week-day-mark"]').map((mark) => mark.attributes('data-filled'))).toEqual([
      'true',
      'false',
      'true',
      'false',
      'false',
      'false',
      'true',
    ])
  })

  it('marks today, and only today', () => {
    const wrapper = mountDays([])

    expect(wrapper.findAll('[data-test="week-day-mark"]').map((mark) => mark.attributes('data-today'))).toEqual([
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'true',
    ])
  })

  it('draws a day without anything the same as any other such day, never as missed', () => {
    const wrapper = mountDays([0])

    const empty = wrapper.findAll('[data-test="week-day-mark"]').filter((mark) => mark.attributes('data-filled') === 'false')
    const looks = new Set(empty.filter((mark) => mark.attributes('data-today') === 'false').map((mark) => mark.classes().join(' ')))
    expect(looks.size).toBe(1)
    expect([...looks][0]).not.toMatch(/danger|warning/)
  })

  it('names each day in full for assistive technology, saying which happened and which is today', () => {
    const wrapper = mountDays([0])

    const spoken = wrapper.findAll('[data-test="week-day"]').map((day) => day.text().replace(/\s+/g, ' ').trim())
    expect(spoken[0]).toContain('Thursday: practised')
    expect(spoken[1]).toContain('Friday')
    expect(spoken[1]).not.toContain('practised')
    expect(spoken[6]).toContain('Wednesday (today)')
  })

  it('reads in pt-BR', async () => {
    i18n.global.locale.value = 'pt-BR'
    const wrapper = mount(WeekDays, { props: { label: 'Dias de prática', markedLabel: 'praticou', days: days([0, 1, 2, 3]) } })

    expect(wrapper.get('[data-test="week-days-label"]').text()).toBe('Dias de prática · 4 de 7')
    expect(wrapper.findAll('[data-test="week-day-letter"]').map((letter) => letter.text())).toEqual(['Q', 'S', 'S', 'D', 'S', 'T', 'Q'])
  })
})
