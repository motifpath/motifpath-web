import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ToastStack from '@/shared/components/ToastStack.vue'
import { useToast } from '@/shared/composables/useToast'

describe('ToastStack', () => {
  it('renders nothing when there are no toasts', () => {
    useToast().clear()
    const wrapper = mount(ToastStack)

    expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(0)
  })

  it('renders a success toast with an accessible status role', () => {
    useToast().clear()
    const { success } = useToast()
    success('Exercise created.')

    const wrapper = mount(ToastStack)
    const toast = wrapper.get('[data-test="toast"]')

    expect(toast.text()).toContain('Exercise created.')
    expect(toast.attributes('role')).toBe('status')
  })

  it('renders an error toast with an accessible alert role', () => {
    useToast().clear()
    const { error } = useToast()
    error('Validation failed. /prompt: must not be empty')

    const wrapper = mount(ToastStack)
    const toast = wrapper.get('[data-test="toast"]')

    expect(toast.text()).toContain('Validation failed. /prompt: must not be empty')
    expect(toast.attributes('role')).toBe('alert')
  })

  it('preserves line breaks in a multi-line message so a bulleted field list renders as a list, not a run-on sentence', () => {
    useToast().clear()
    const { error } = useToast()
    error('Request failed validation:\n• /title: must not be empty\n• /prompt: must not be empty')

    const wrapper = mount(ToastStack)
    const message = wrapper.get('[data-test="toast-message"]')

    expect(message.classes()).toContain('whitespace-pre-line')
    expect(message.element.textContent).toBe(
      'Request failed validation:\n• /title: must not be empty\n• /prompt: must not be empty',
    )
  })

  it('dismisses a toast when its close control is used', async () => {
    useToast().clear()
    const { error } = useToast()
    error('Something went wrong.')

    const wrapper = mount(ToastStack)
    await wrapper.get('[data-test="toast-dismiss"]').trigger('click')

    expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(0)
  })

  it('stacks multiple toasts', () => {
    useToast().clear()
    const { success, error } = useToast()
    success('Exercise created.')
    error('Upload failed.')

    const wrapper = mount(ToastStack)

    expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(2)
  })
})
