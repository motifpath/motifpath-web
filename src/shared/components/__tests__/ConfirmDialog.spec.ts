import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const props = { open: true, title: 'Retire this course?', message: 'It leaves the catalog.', confirmLabel: 'Retire' }

describe('ConfirmDialog', () => {
  it('shows the question and its consequence', () => {
    const wrapper = mount(ConfirmDialog, { props })

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Retire this course?')
    expect(wrapper.text()).toContain('It leaves the catalog.')
    expect(wrapper.get('[data-test="confirm-dialog-confirm"]').text()).toBe('Retire')
  })

  it('renders nothing while closed', () => {
    const wrapper = mount(ConfirmDialog, { props: { ...props, open: false } })

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('confirms or cancels', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
    await wrapper.get('[data-test="confirm-dialog-cancel"]').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('cannot be confirmed twice while busy', () => {
    const wrapper = mount(ConfirmDialog, { props: { ...props, busy: true } })

    expect(wrapper.get('[data-test="confirm-dialog-confirm"]').attributes('disabled')).toBeDefined()
  })
})
