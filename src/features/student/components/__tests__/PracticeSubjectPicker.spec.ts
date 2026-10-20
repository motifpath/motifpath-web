import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import PracticeSubjectPicker from '@/features/student/components/PracticeSubjectPicker.vue'

type Subject = components['schemas']['PracticeSubject']
type SubjectList = components['schemas']['PracticeSubjectList']

function subject(id: string, en: string, fields: Partial<Subject> = {}): Subject {
  return { node_id: id, names: { en }, on_path: false, item_count: 4, level: 'new', current_rung: 'know', ...fields }
}

const diatonic = subject('diatonic', 'Diatonic chords', { on_path: true, level: 'learning' })
const fn = subject('function', 'Chord function')
const wide = subject('harmony-wide', 'Harmony basics', { level: null })
const intervals = subject('intervals', 'Recognise intervals', { level: 'accurate' })

const list: SubjectList = {
  instrument_id: null,
  groups: [
    { area_node_id: 'harmony', names: { en: 'Harmony' }, subjects: [diatonic, fn, wide] },
    { area_node_id: 'ear', names: { en: 'Ear' }, subjects: [intervals] },
  ],
}

function mountPicker(props: Partial<{ list: SubjectList | null; isLoading: boolean; error: boolean }> = {}) {
  return mount(PracticeSubjectPicker, { props: { list, isLoading: false, error: false, ...props } })
}

const rowNames = (wrapper: ReturnType<typeof mountPicker>, test: string) =>
  wrapper.findAll(`[data-test="${test}"]`).map((row) => row.get('[data-test="subject-name"]').text())

describe('PracticeSubjectPicker', () => {
  it('asks what the student wants to get better at, with search', () => {
    const wrapper = mountPicker()

    expect(wrapper.get('h1').text()).toBe('What to practise')
    expect(wrapper.text()).toContain('What do you want to get better at?')
    expect(wrapper.get('input[type="search"]').attributes('placeholder')).toBe('Search skills and concepts')
  })

  it("lists the student's path subjects first, with their level only", () => {
    const wrapper = mountPicker()

    const rows = wrapper.findAll('[data-test="path-subject"]')
    expect(rows.map((row) => [row.get('[data-test="subject-name"]').text(), row.get('[data-test="subject-detail"]').text()])).toEqual([
      ['Diatonic chords', 'Learning'],
    ])
  })

  it('then offers every area to explore, which opens its subjects', async () => {
    const wrapper = mountPicker()

    expect(wrapper.findAll('[data-test="subject-area"]').map((area) => area.text())).toEqual(['Harmony', 'Ear'])

    await wrapper.findAll('[data-test="subject-area"]')[0].trigger('click')

    expect(wrapper.get('h1').text()).toBe('Harmony')
    expect(rowNames(wrapper, 'area-subject')).toEqual(['Diatonic chords', 'Chord function', 'Harmony basics'])
    expect(wrapper.findAll('[data-test="area-subject"]').map((row) => row.find('[data-test="subject-detail"]').exists() ? row.get('[data-test="subject-detail"]').text() : null)).toEqual([
      'Learning · on your path',
      'New',
      null,
    ])
  })

  it('goes back from an area to the whole list', async () => {
    const wrapper = mountPicker()
    await wrapper.findAll('[data-test="subject-area"]')[1].trigger('click')

    await wrapper.get('[data-test="picker-back"]').trigger('click')

    expect(wrapper.get('h1').text()).toBe('What to practise')
  })

  it('picks a subject with a tap, from the path, an area or a search', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="path-subject"]').trigger('click')
    await wrapper.findAll('[data-test="subject-area"]')[1].trigger('click')
    await wrapper.get('[data-test="area-subject"]').trigger('click')

    expect(wrapper.emitted('pick')).toEqual([[diatonic], [intervals]])
  })

  it('shows what matches the search in place of the lists', async () => {
    const wrapper = mountPicker()

    await wrapper.get('input[type="search"]').setValue('chord')

    expect(wrapper.find('[data-test="subject-area"]').exists()).toBe(false)
    expect(rowNames(wrapper, 'found-subject')).toEqual(['Diatonic chords', 'Chord function'])
    await wrapper.findAll('[data-test="found-subject"]')[1].trigger('click')
    expect(wrapper.emitted('pick')).toEqual([[fn]])
  })

  it('says when nothing matches the search', async () => {
    const wrapper = mountPicker()

    await wrapper.get('input[type="search"]').setValue('banjo')

    expect(wrapper.get('[data-test="no-match"]').text()).toBe('Nothing matches “banjo”.')
  })

  it('leaves out From your path when no path subject is offered', () => {
    const wrapper = mountPicker({ list: { instrument_id: null, groups: [list.groups[1]] } })

    expect(wrapper.find('[data-test="path-subject"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('From your path')
  })

  it('says when there is nothing to choose for this instrument', () => {
    const wrapper = mountPicker({ list: { instrument_id: null, groups: [] } })

    expect(wrapper.get('[data-test="no-subjects"]').text()).toBe('Nothing can be practised this way yet. Try another instrument, or in your head.')
  })

  it('shows the list loading, never blank', () => {
    expect(mountPicker({ list: null, isLoading: true }).find('[aria-busy="true"]').exists()).toBe(true)
  })

  it('says in place when the list did not load, with Try again', async () => {
    const wrapper = mountPicker({ list: null, error: true })

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toEqual([[]])
  })
})
