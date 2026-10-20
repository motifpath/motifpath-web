import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
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

  it('shows one toast at a time: the latest replaces the previous one', () => {
    useToast().clear()
    const { success, error } = useToast()
    success('Exercise created.')
    error('Upload failed.')

    const wrapper = mount(ToastStack)

    expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="toast"]').text()).toContain('Upload failed.')
  })

  it('sits at the bottom of the screen on the inverse surface', () => {
    useToast().clear()
    useToast().neutral('Saved.')

    const wrapper = mount(ToastStack)

    expect(wrapper.get('[data-test="toast-region"]').classes()).toContain('bottom-0')
    expect(wrapper.get('[data-test="toast"]').classes()).toEqual(expect.arrayContaining(['bg-ink', 'text-surface']))
  })

  it('renders a neutral toast with a status role', () => {
    useToast().clear()
    useToast().neutral('Major triads is now your current course.')

    const wrapper = mount(ToastStack)

    expect(wrapper.get('[data-test="toast"]').attributes('role')).toBe('status')
  })

  it("runs the toast's action and closes the toast when the action is used", async () => {
    useToast().clear()
    const run = vi.fn()
    useToast().neutral('Major triads is now your current course.', { action: { label: 'Undo', run } })

    const wrapper = mount(ToastStack)
    const action = wrapper.get('[data-test="toast-action"]')
    expect(action.text()).toBe('Undo')
    await action.trigger('click')

    expect(run).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(0)
  })

  it('offers a close control only on an error toast, which never goes on its own', () => {
    useToast().clear()
    useToast().success('Saved.')
    const wrapper = mount(ToastStack)
    expect(wrapper.find('[data-test="toast-dismiss"]').exists()).toBe(false)
  })

  describe('while the pointer is over it or focus is inside it', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('keeps the toast on screen past its time', async () => {
      useToast().clear()
      useToast().success('Saved.')
      const wrapper = mount(ToastStack)

      await wrapper.get('[data-test="toast"]').trigger('mouseenter')
      vi.advanceTimersByTime(20_000)
      await nextTick()
      expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(1)

      await wrapper.get('[data-test="toast"]').trigger('mouseleave')
      vi.advanceTimersByTime(5000)
      await nextTick()
      expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(0)
    })

    it('keeps the toast on screen while it holds keyboard focus', async () => {
      useToast().clear()
      useToast().neutral('Switched.', { action: { label: 'Undo', run: () => {} } })
      const wrapper = mount(ToastStack)

      await wrapper.get('[data-test="toast"]').trigger('focusin')
      vi.advanceTimersByTime(20_000)
      await nextTick()

      expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(1)
    })
  })
})
