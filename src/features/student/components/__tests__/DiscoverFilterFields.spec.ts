import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiscoverFilterFields from '@/features/student/components/DiscoverFilterFields.vue'
import type { DiscoverFilters } from '@/features/student/utils/discoverQuery'

const NONE: DiscoverFilters = { levels: [], skills: [], concepts: [] }

const instruments = [
  { id: 'inst-guitar', name: 'Guitar' },
  { id: 'inst-bass', name: 'Bass' },
]

function mountFields(filters: DiscoverFilters = NONE, teacherName: string | null = null) {
  const wrapper = mount(DiscoverFilterFields, {
    props: {
      modelValue: filters,
      'onUpdate:modelValue': (next: DiscoverFilters) => wrapper.setProps({ modelValue: next }),
      instruments,
      teacherName,
    },
  })
  return wrapper
}

type Wrapper = ReturnType<typeof mountFields>

function chip(wrapper: Wrapper, group: string, label: string) {
  const found = wrapper
    .get(`[data-test="filter-group-${group}"]`)
    .findAll('button[aria-pressed]')
    .find((button) => button.text() === label)
  if (!found) throw new Error(`no ${group} chip ${label}`)
  return found
}

function chosen(wrapper: Wrapper, group: string) {
  return wrapper
    .get(`[data-test="filter-group-${group}"]`)
    .findAll('button[aria-pressed="true"]')
    .map((button) => button.text())
}

const model = (wrapper: Wrapper) => wrapper.props('modelValue')

describe('DiscoverFilterFields', () => {
  it('offers Level, Instrument and Language as chips and Teacher as a row, and nothing else', () => {
    const wrapper = mountFields()

    const groups = wrapper.findAll('[data-test^="filter-group-"]').map((group) => group.attributes('data-test'))
    expect(groups).toEqual([
      'filter-group-levels',
      'filter-group-instrument',
      'filter-group-language',
      'filter-group-teacher',
    ])
    expect(wrapper.get('[data-test="filter-group-levels"]').text()).toContain('Beginner')
    expect(wrapper.get('[data-test="filter-group-instrument"]').text()).toContain('Guitar')
    expect(wrapper.get('[data-test="filter-group-language"]').text()).toContain('Portuguese')
    expect(wrapper.text()).not.toMatch(/skill|concept/i)
  })

  it('lets several levels be chosen, and a second tap unchooses one', async () => {
    const wrapper = mountFields()

    await chip(wrapper, 'levels', 'Beginner').trigger('click')
    await chip(wrapper, 'levels', 'Intermediate').trigger('click')
    expect(chosen(wrapper, 'levels')).toEqual(['Beginner', 'Intermediate'])

    await chip(wrapper, 'levels', 'Beginner').trigger('click')
    expect(model(wrapper).levels).toEqual(['intermediate'])
  })

  it('keeps one instrument: choosing another replaces it, and tapping the chosen one clears it', async () => {
    const wrapper = mountFields()

    await chip(wrapper, 'instrument', 'Guitar').trigger('click')
    await chip(wrapper, 'instrument', 'Bass').trigger('click')
    expect(chosen(wrapper, 'instrument')).toEqual(['Bass'])
    expect(model(wrapper).instrument).toBe('inst-bass')

    await chip(wrapper, 'instrument', 'Bass').trigger('click')
    expect(model(wrapper)).not.toHaveProperty('instrument')
  })

  it('keeps one language', async () => {
    const wrapper = mountFields({ ...NONE, language: 'en' })

    await chip(wrapper, 'language', 'Portuguese').trigger('click')
    expect(chosen(wrapper, 'language')).toEqual(['Portuguese'])
    expect(model(wrapper).language).toBe('pt_BR')
  })

  it('leaves a skill or concept that came with the address as it is', async () => {
    const wrapper = mountFields({ ...NONE, skills: ['s-1'], concepts: ['c-1'] })

    await chip(wrapper, 'levels', 'Beginner').trigger('click')
    expect(model(wrapper)).toMatchObject({ skills: ['s-1'], concepts: ['c-1'] })
  })

  it('sums up the teacher on its row, and asks for the teacher list when tapped', async () => {
    const anyone = mountFields()
    expect(anyone.get('[data-test="filter-group-teacher"]').text()).toContain('Any teacher')

    const wrapper = mountFields({ ...NONE, teacher: 'u-bob' }, 'Bob Martins')
    expect(wrapper.get('[data-test="filter-group-teacher"]').text()).toContain('Bob Martins')

    await wrapper.get('[data-test="filter-group-teacher"] button').trigger('click')
    expect(wrapper.emitted('openTeacher')).toHaveLength(1)
  })
})
