import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import CourseFilters from '@/shared/components/CourseFilters.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import { knowledgeNode } from '@/shared/testUtils/knowledgeNode'
import { i18n } from '@/i18n'

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

function pickerLabelled(wrapper: ReturnType<typeof mountFilters>, label: string) {
  const picker = wrapper.findAllComponents(SkillConceptTreePicker).find((p) => p.props('label') === label)
  if (!picker) throw new Error(`no ${label} picker`)
  return picker
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
      knowledgeNode('chords'),
      knowledgeNode('triads', { parent_id: 'chords' }),
      knowledgeNode('sevenths', { parent_id: 'chords' }),
      knowledgeNode('arpeggios'),
    ]

    beforeEach(() => {
      GET.mockImplementation((path: string, init?: { params?: { query?: { kind?: string } } }) =>
        Promise.resolve({
          data: path === '/knowledge-nodes' && init?.params?.query?.kind === 'skill' ? skills : [],
          error: undefined,
          response: { status: 200 },
        }),
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
      return { wrapper, picker: pickerLabelled(wrapper, 'Skill') }
    }

    it('shows a skill filter the catalog started with as picked, and keeps it when another is picked', async () => {
      const { wrapper, picker } = await openSkillPicker(['triads'])

      expect(picker.props('selectedIds')).toEqual(expect.arrayContaining(['triads']))
      picker.vm.$emit('update:selectedIds', [...picker.props('selectedIds'), 'arpeggios'])

      expect(lastSkillIds(wrapper)).toEqual(expect.arrayContaining(['triads', 'arpeggios']))
    })

    it('says the skills failed to load, and loads them again on retry', async () => {
      GET.mockImplementation((path: string, init?: { params?: { query?: { kind?: string } } }) =>
        Promise.resolve(
          path === '/knowledge-nodes' && init?.params?.query?.kind === 'skill'
            ? { data: undefined, error: { message: 'boom' }, response: { status: 500 } }
            : { data: [], error: undefined, response: { status: 200 } },
        ),
      )
      const { picker } = await openSkillPicker([])
      expect(picker.props('loadFailed')).toBe(true)

      GET.mockClear()
      picker.vm.$emit('retry')
      await flushPromises()

      expect(GET).toHaveBeenCalledWith('/knowledge-nodes', { params: { query: { kind: 'skill' } } })
    })

    it('names an applied skill filter in the UI language', async () => {
      skills[1] = knowledgeNode('triads', { parent_id: 'chords', names: { en: 'Triads', pt_BR: 'Tríades' } })
      i18n.global.locale.value = 'pt-BR'
      try {
        const wrapper = mountFilters({ compact: true, hasActiveFilters: true, skillIds: ['triads'] })
        await flushPromises()

        expect(wrapper.get('[data-test="applied-filter-skill-triads"]').text()).toContain('Tríades')
      } finally {
        i18n.global.locale.value = 'en'
        skills[1] = knowledgeNode('triads', { parent_id: 'chords' })
      }
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

  it('asks for the concepts before the skills, in the filters and in the applied-filter pills', async () => {
    GET.mockImplementation((path: string, init?: { params?: { query?: { kind?: string } } }) =>
      Promise.resolve({
        data:
          path === '/knowledge-nodes'
            ? init?.params?.query?.kind === 'skill'
              ? [knowledgeNode('s-1', { names: { en: 'Bends' } })]
              : [knowledgeNode('c-1', { kind: 'concept', names: { en: 'Pitch' } })]
            : [],
        error: undefined,
        response: { status: 200 },
      }),
    )
    const wrapper = mountFilters({ compact: true, hasActiveFilters: true, skillIds: ['s-1'], conceptIds: ['c-1'] })
    await flushPromises()

    expect(wrapper.findAll('[data-test^="applied-filter-"]').map((pill) => pill.attributes('data-test'))).toEqual([
      'applied-filter-concept-c-1',
      'applied-filter-skill-s-1',
    ])
    await wrapper.get('[data-test="advanced-filters"]').trigger('click')
    expect(wrapper.findAllComponents(SkillConceptTreePicker).map((p) => p.props('label'))).toEqual(['Concept', 'Skill'])
  })

  it('lists every skill to search through when no concept is picked', async () => {
    GET.mockImplementation((path: string, init?: { params?: { query?: { kind?: string; type?: string } } }) =>
      Promise.resolve({
        data:
          path === '/knowledge-nodes'
            ? init?.params?.query?.kind === 'skill'
              ? [knowledgeNode('s-1', { names: { en: 'Bends' } }), knowledgeNode('s-2', { names: { en: 'Slides' } })]
              : [knowledgeNode('c-1', { kind: 'concept', names: { en: 'Pitch' } })]
            : path === '/knowledge-edges'
              ? [{ edge_id: 'e-1', from_id: 's-1', to_id: 'c-1', type: 'applies', level: null }]
              : [],
        error: undefined,
        response: { status: 200 },
      }),
    )
    const wrapper = mountFilters({ compact: true })
    await flushPromises()
    await wrapper.get('[data-test="advanced-filters"]').trigger('click')

    const skillPicker = pickerLabelled(wrapper, 'Skill')
    await skillPicker.get('[data-test="tree-open-picker"]').trigger('click')
    await flushPromises()

    expect(skillPicker.findAll('[data-test="tree-node-name"]').map((name) => name.text())).toEqual(['Bends', 'Slides'])
    await skillPicker.get('[data-test="tree-search"]').setValue('sli')
    expect(skillPicker.findAll('[data-test="tree-node-name"]').map((name) => name.text())).toEqual(['Slides'])
  })

  it('suggests the skills that apply the picked concepts', async () => {
    GET.mockImplementation((path: string, init?: { params?: { query?: { kind?: string; type?: string } } }) =>
      Promise.resolve({
        data:
          path === '/knowledge-nodes'
            ? init?.params?.query?.kind === 'skill'
              ? [knowledgeNode('s-1')]
              : [knowledgeNode('c-1', { kind: 'concept' })]
            : path === '/knowledge-edges' && init?.params?.query?.type === 'applies'
              ? [{ edge_id: 'e-1', from_id: 's-1', to_id: 'c-1', type: 'applies', level: null }]
              : [],
        error: undefined,
        response: { status: 200 },
      }),
    )
    const wrapper = mountFilters()
    await flushPromises()

    pickerLabelled(wrapper, 'Concept').vm.$emit('update:selectedIds', ['c-1'])
    await flushPromises()

    expect(pickerLabelled(wrapper, 'Skill').props('suggestedIds')).toEqual(['s-1'])
  })

  describe('a whole area picked', () => {
    const skills = [
      knowledgeNode('chords', { names: { en: 'Chords' } }),
      knowledgeNode('triads', { names: { en: 'Triads' }, parent_id: 'chords' }),
      knowledgeNode('sevenths', { names: { en: 'Sevenths' }, parent_id: 'chords' }),
    ]

    beforeEach(() => {
      GET.mockImplementation((path: string, init?: { params?: { query?: { kind?: string } } }) =>
        Promise.resolve({
          data: path === '/knowledge-nodes' && init?.params?.query?.kind === 'skill' ? skills : [],
          error: undefined,
          response: { status: 200 },
        }),
      )
    })

    it('filters by the area and everything under it', async () => {
      const wrapper = mountFilters()
      await flushPromises()

      pickerLabelled(wrapper, 'Skill').vm.$emit('update:selectedIds', ['chords', 'triads', 'sevenths'])

      expect(wrapper.emitted('update:skillIds')?.at(-1)).toEqual([['chords', 'triads', 'sevenths']])
    })

    it('shows the area as one pill that counts the rest, and clears it whole', async () => {
      const wrapper = mountFilters({
        compact: true,
        hasActiveFilters: true,
        skillIds: ['chords', 'triads', 'sevenths'],
      })
      await flushPromises()

      const pills = wrapper.findAll('[data-test^="applied-filter-skill-"]')
      expect(pills.map((pill) => pill.text())).toEqual(['Chords +2'])
      await pills[0]!.trigger('click')

      expect(wrapper.emitted('update:skillIds')?.at(-1)).toEqual([[]])
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

  it('offers the level filter unless told the items have no level', async () => {
    const withLevels = mountFilters()
    const withoutLevels = mountFilters({ levelFilter: false })
    await flushPromises()

    expect(withLevels.find('[data-test="level-filter-beginner"]').exists()).toBe(true)
    expect(withoutLevels.find('[data-test="level-filter-beginner"]').exists()).toBe(false)
  })

  it('lets one skill and one concept be picked when the list filters by a single one of each', async () => {
    const multiple = mountFilters()
    const single = mountFilters({ singleClassification: true })
    await flushPromises()

    expect(multiple.findAllComponents(SkillConceptTreePicker).map((p) => p.props('multiple'))).toEqual([true, true])
    expect(single.findAllComponents(SkillConceptTreePicker).map((p) => p.props('multiple'))).toEqual([false, false])
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
