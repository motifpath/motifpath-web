import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EditorBody from '@/shared/components/EditorBody.vue'

const slots = { side: '<section data-test="status">Status</section>', default: '<section data-test="details">Details</section>' }

describe('EditorBody', () => {
  it('puts the status first in one column on a phone', () => {
    const wrapper = mount(EditorBody, { props: { twoColumns: false }, slots })

    const order = wrapper.findAll('section').map((section) => section.attributes('data-test'))
    expect(order).toEqual(['status', 'details'])
    expect(wrapper.get('[data-test="editor-side"]').classes()).not.toContain('sticky')
  })

  it('keeps the side column beside the form, sticky, on a wide screen', () => {
    const wrapper = mount(EditorBody, { props: { twoColumns: true }, slots })

    const side = wrapper.get('[data-test="editor-side"]')
    expect(side.classes()).toContain('sticky')
    expect(wrapper.get('[data-test="editor-main"]').text()).toBe('Details')
  })

  it('has no side column when the editor has nothing for it', () => {
    const wrapper = mount(EditorBody, { props: { twoColumns: true }, slots: { default: slots.default } })

    expect(wrapper.find('[data-test="editor-side"]').exists()).toBe(false)
  })
})
