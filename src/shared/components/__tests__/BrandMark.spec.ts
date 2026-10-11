import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BrandMark from '@/shared/components/BrandMark.vue'

describe('BrandMark', () => {
  it.each(['lg', 'xl'] as const)('at %s is the full mark: three notes and the legato', (size) => {
    const wrapper = mount(BrandMark, { props: { size } })

    expect(wrapper.findAll('[data-test="brand-note"]')).toHaveLength(3)
    expect(wrapper.find('[data-test="brand-legato"]').exists()).toBe(true)
  })

  it.each(['sm', 'md'] as const)('at %s is the simplified mark, too small for the notes', (size) => {
    const wrapper = mount(BrandMark, { props: { size } })

    expect(wrapper.findAll('[data-test="brand-note"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="brand-legato"]').exists()).toBe(false)
  })

  it('gives every mark on a page its own gradient, so two marks never share an id', () => {
    const wrapper = mount({ components: { BrandMark }, template: '<div><BrandMark size="lg" /><BrandMark size="xl" /></div>' })

    const ids = wrapper.findAll('[id]').map((node) => node.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
