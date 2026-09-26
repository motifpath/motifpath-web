import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import CourseFilters from '@/shared/components/CourseFilters.vue'

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
})
