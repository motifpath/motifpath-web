import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SaveDiagramAsModal from '@/features/teacher/components/SaveDiagramAsModal.vue'

function mountModal(props: Partial<{ open: boolean; initialName: string; asTemplate: boolean; saving: boolean }> = {}) {
  return mount(SaveDiagramAsModal, {
    props: { open: true, initialName: 'Minor Pentatonic (copy)', asTemplate: false, saving: false, ...props },
  })
}

describe('SaveDiagramAsModal', () => {
  it('renders nothing while closed', () => {
    expect(mountModal({ open: false }).find('[data-test="save-as-name"]').exists()).toBe(false)
  })

  it('offers the suggested name, ready to edit', () => {
    const wrapper = mountModal()

    expect((wrapper.get('[data-test="save-as-name"]').element as HTMLInputElement).value).toBe('Minor Pentatonic (copy)')
  })

  it('titles itself for a copy or for a template', () => {
    expect(mountModal().text()).toContain('Save a copy')
    expect(mountModal({ asTemplate: true }).text()).toContain('Save as template')
  })

  it('confirms with the entered name, trimmed', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="save-as-name"]').setValue('  My Pentatonic  ')
    await wrapper.get('[data-test="save-as-form"]').trigger('submit')

    expect(wrapper.emitted('confirm')).toEqual([['My Pentatonic']])
  })

  it('cannot confirm without a name, or while a save is in progress', async () => {
    const wrapper = mountModal()
    await wrapper.get('[data-test="save-as-name"]').setValue('   ')
    await wrapper.get('[data-test="save-as-form"]').trigger('submit')
    expect(wrapper.get('[data-test="save-as-confirm"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('confirm')).toBeUndefined()

    const saving = mountModal({ saving: true })
    await saving.get('[data-test="save-as-form"]').trigger('submit')
    expect(saving.get('[data-test="save-as-confirm"]').attributes('disabled')).toBeDefined()
    expect(saving.emitted('confirm')).toBeUndefined()
  })

  it('closes from its cancel button', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="save-as-cancel"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('resets to the suggested name each time it reopens', async () => {
    const wrapper = mountModal()
    await wrapper.get('[data-test="save-as-name"]').setValue('Something else')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true, initialName: 'Scale (copy)' })

    expect((wrapper.get('[data-test="save-as-name"]').element as HTMLInputElement).value).toBe('Scale (copy)')
  })
})
