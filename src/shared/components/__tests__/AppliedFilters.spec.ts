import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppliedFilters from '@/shared/components/AppliedFilters.vue'
import FilterButton from '@/shared/components/FilterButton.vue'
import FilterChip from '@/shared/components/FilterChip.vue'

describe('FilterChip', () => {
  it('names the filter and removes it from ×', async () => {
    const wrapper = mount(FilterChip, { props: { label: 'Root A' } })

    expect(wrapper.text()).toContain('Root A')
    const remove = wrapper.get('button')
    expect(remove.attributes('aria-label')).toBe('Remove Root A')

    await remove.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})

describe('FilterButton', () => {
  it('says how many filters are applied', () => {
    const wrapper = mount(FilterButton, { props: { count: 3 } })

    expect(wrapper.get('button').attributes('aria-label')).toBe('Filters, 3 applied')
    expect(wrapper.get('[data-test="filter-count"]').text()).toBe('3')
  })

  it('shows no count with no filter applied', () => {
    const wrapper = mount(FilterButton, { props: { count: 0 } })

    expect(wrapper.get('button').attributes('aria-label')).toBe('Filters')
    expect(wrapper.find('[data-test="filter-count"]').exists()).toBe(false)
  })

  it('opens the filters', async () => {
    const wrapper = mount(FilterButton, { props: { count: 0 } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('AppliedFilters', () => {
  const chips = [
    { id: 'instrument', label: 'Guitar' },
    { id: 'skill:s1', label: 'Pentatonic shapes' },
  ]

  it('shows each applied filter as a chip, then Clear all', () => {
    const wrapper = mount(AppliedFilters, { props: { chips } })

    expect(wrapper.findAll('[data-test="filter-chip"]').map((chip) => chip.text())).toEqual([
      'Guitar',
      'Pentatonic shapes',
    ])
    expect(wrapper.get('[data-test="clear-all-filters"]').text()).toBe('Clear all')
  })

  it('says which chip was removed', async () => {
    const wrapper = mount(AppliedFilters, { props: { chips } })

    await wrapper.findAll('[data-test="filter-chip"] button')[1]!.trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['skill:s1']])
  })

  it('clears them all', async () => {
    const wrapper = mount(AppliedFilters, { props: { chips } })
    await wrapper.get('[data-test="clear-all-filters"]').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('renders nothing with no filter applied', () => {
    const wrapper = mount(AppliedFilters, { props: { chips: [] } })
    expect(wrapper.find('[data-test="applied-filters"]').exists()).toBe(false)
  })
})
