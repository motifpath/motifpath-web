import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'

describe('ModalCloseButton', () => {
  it('renders a close button with an accessible label', () => {
    const wrapper = mount(ModalCloseButton)

    const button = wrapper.get('[data-test="close-modal"]')
    expect(button.attributes('aria-label')).toBe('Close')
  })

  it('emits close when clicked', async () => {
    const wrapper = mount(ModalCloseButton)

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
