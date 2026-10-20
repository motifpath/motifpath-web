import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SearchField from '@/shared/components/SearchField.vue'

describe('SearchField', () => {
  it('searches as the text is typed, labelled by its placeholder', async () => {
    const wrapper = mount(SearchField, { props: { modelValue: '', placeholder: 'Search title or artist' } })

    await wrapper.get('input').setValue('grace')

    expect(wrapper.emitted('update:modelValue')).toEqual([['grace']])
    expect(wrapper.get('input').attributes('aria-label')).toBe('Search title or artist')
  })

  it('offers × to clear only while there is text', async () => {
    const wrapper = mount(SearchField, { props: { modelValue: '', placeholder: 'Search' } })
    expect(wrapper.find('[data-test="search-clear"]').exists()).toBe(false)

    await wrapper.setProps({ modelValue: 'grace' })
    await wrapper.get('[data-test="search-clear"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
  })
})
