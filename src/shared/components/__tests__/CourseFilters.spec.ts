import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import CourseFilters from '@/shared/components/CourseFilters.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'

const instruments = [{ instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] }]

function mountFilters(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(CourseFilters, {
    props: {
      hasActiveFilters: false,
      searchText: '',
      levels: [],
      skillIds: [],
      conceptIds: [],
      ...props,
    },
    slots,
  })
}

describe('CourseFilters', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockImplementation((path: string) =>
      Promise.resolve({ data: path === '/instruments' ? instruments : [], error: undefined, response: { status: 200 } }),
    )
  })

  describe('skill picks made outside the picker', () => {
    const skills = [
      { skill_id: 'chords', name: 'chords', parent_id: null },
      { skill_id: 'triads', name: 'triads', parent_id: 'chords' },
      { skill_id: 'arpeggios', name: 'arpeggios', parent_id: null },
    ]

    beforeEach(() => {
      GET.mockImplementation((path: string) =>
        Promise.resolve({ data: path === '/skills' ? skills : [], error: undefined, response: { status: 200 } }),
      )
    })

    function lastSkillIds(wrapper: ReturnType<typeof mountFilters>): string[] {
      const ids = wrapper.emitted('update:skillIds')?.at(-1)?.[0]
      if (!Array.isArray(ids)) throw new Error('expected the skill filter to change')
      return ids.filter((id): id is string => typeof id === 'string')
    }

    async function openSkillPicker(skillIds: string[]) {
      const wrapper = mountFilters({ compact: true, hasActiveFilters: true, skillIds })
      await flushPromises()
      await wrapper.get('[data-test="advanced-filters"]').trigger('click')
      return { wrapper, picker: wrapper.findAllComponents(SkillConceptTreePicker)[0]! }
    }

    it('shows a skill filter the catalog started with as picked, and keeps it when another is picked', async () => {
      const { wrapper, picker } = await openSkillPicker(['triads'])

      expect(picker.props('selectedIds')).toEqual(expect.arrayContaining(['triads']))
      picker.vm.$emit('update:selectedIds', [...picker.props('selectedIds'), 'arpeggios'])

      expect(lastSkillIds(wrapper)).toEqual(expect.arrayContaining(['triads', 'arpeggios']))
    })

    it('unpicks a skill whose applied-filter chip was removed, so the next pick does not bring it back', async () => {
      const { wrapper, picker } = await openSkillPicker([])
      picker.vm.$emit('update:selectedIds', ['chords', 'triads', 'arpeggios'])
      await wrapper.setProps({ skillIds: lastSkillIds(wrapper) })

      await wrapper.get('[data-test="applied-filter-skill-triads"]').trigger('click')
      await wrapper.setProps({ skillIds: lastSkillIds(wrapper) })

      expect(picker.props('selectedIds')).not.toContain('triads')
      picker.vm.$emit('update:selectedIds', [...picker.props('selectedIds'), 'chords'])
      expect(lastSkillIds(wrapper)).not.toContain('triads')
    })
  })

  it('names the compact filters dialog by its heading', async () => {
    const wrapper = mountFilters({ compact: true })
    await wrapper.get('[data-test="advanced-filters"]').trigger('click')

    const dialog = wrapper.get('[role="dialog"]')
    const labelId = dialog.attributes('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(wrapper.get(`[id="${labelId}"]`).text()).toBe('Filters')
  })

  it('offers no instrument or language filter unless asked to', async () => {
    const wrapper = mountFilters()
    await flushPromises()

    expect(wrapper.find('[data-test="instrument-filter"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="language-filter"]').exists()).toBe(false)
  })

  it('filters by instrument', async () => {
    const wrapper = mountFilters({ instrumentFilter: true, instrumentId: null })
    await flushPromises()

    await wrapper.get('[data-test="instrument-filter"]').setValue('i-guitar')

    expect(wrapper.emitted('update:instrumentId')).toEqual([['i-guitar']])
  })

  it('filters by language, with any language as the empty choice', async () => {
    const wrapper = mountFilters({ languageFilter: true, language: 'pt_BR' })
    await flushPromises()

    const select = wrapper.get<HTMLSelectElement>('[data-test="language-filter"]')
    expect(select.element.value).toBe('pt_BR')
    expect(select.findAll('option')[0]!.text()).toBe('Any language')

    await select.setValue('')
    expect(wrapper.emitted('update:language')).toEqual([[null]])
  })

  it('names the search after what is being searched', async () => {
    const wrapper = mountFilters({ searchPlaceholder: 'Search by title' })
    await flushPromises()

    expect(wrapper.get('[data-test="catalog-search"]').attributes('placeholder')).toBe('Search by title')
  })

  it('shows extra filters passed in', async () => {
    const wrapper = mountFilters({}, { default: '<label data-test="extra-filter">Only mine</label>' })
    await flushPromises()

    expect(wrapper.find('[data-test="extra-filter"]').exists()).toBe(true)
  })

  it('keeps advanced filters in a modal when the compact variant is used', async () => {
    const wrapper = mountFilters({ compact: true, instrumentFilter: true, languageFilter: true })
    await flushPromises()

    expect(wrapper.find('[data-test="catalog-search"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="advanced-filters"]').text()).toBe('Filters')
    expect(wrapper.find('[data-test="level-filter-beginner"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)

    await wrapper.get('[data-test="advanced-filters"]').trigger('click')

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="level-filter-beginner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="instrument-filter"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="language-filter"]').exists()).toBe(true)
  })

  it('shows compact applied filters as removable pills', async () => {
    const wrapper = mountFilters({ compact: true, hasActiveFilters: true, levels: ['beginner'] })
    await flushPromises()

    expect(wrapper.get('[data-test="applied-filter-level-beginner"]').text()).toContain('Beginner')

    await wrapper.get('[data-test="applied-filter-level-beginner"]').trigger('click')
    expect(wrapper.emitted('update:levels')).toEqual([[[]]])
  })
})
