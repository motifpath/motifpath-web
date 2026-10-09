import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ModalOverlay from '@/shared/components/ModalOverlay.vue'

describe('ModalOverlay', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(ModalOverlay, { props: { open: false } })

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)
  })

  it('renders the default slot inside the panel when open', () => {
    const wrapper = mount(ModalOverlay, {
      props: { open: true },
      slots: { default: '<p data-test="body">Hello</p>' },
    })

    expect(wrapper.get('[data-test="body"]').text()).toBe('Hello')
  })

  it('applies panelClass to the panel element', () => {
    const wrapper = mount(ModalOverlay, { props: { open: true, panelClass: 'w-[420px]' } })

    expect(wrapper.get('[data-test="modal-panel"]').classes()).toContain('w-[420px]')
  })

  it('emits close when the scrim around the panel is clicked', async () => {
    const wrapper = mount(ModalOverlay, { props: { open: true } })

    await wrapper.get('[data-test="overlay-scrim"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when the panel is clicked', async () => {
    const wrapper = mount(ModalOverlay, { props: { open: true } })

    await wrapper.get('[data-test="modal-panel"]').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('closes on Esc', async () => {
    const wrapper = mount(ModalOverlay, { props: { open: true }, slots: { default: '<button>Inside</button>' } })

    await wrapper.get('[data-test="modal-panel"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
