import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import MergeLayersModal from '@/features/teacher/components/MergeLayersModal.vue'

function mountModal(open = true) {
  return mount(MergeLayersModal, { props: { open } })
}

const regionOption = (wrapper: ReturnType<typeof mountModal>) =>
  wrapper.get<HTMLInputElement>('[data-test="merge-region-per-layer"]')

describe('MergeLayersModal', () => {
  it('explains the merge and offers a region per layer, pre-selected', () => {
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Merge the layers')
    expect(regionOption(wrapper).element.checked).toBe(true)
  })

  it('merges with a region per layer unless the author declines it', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="merge-confirm"]').trigger('click')
    await regionOption(wrapper).setValue(false)
    await wrapper.get('[data-test="merge-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[true], [false]])
  })

  it('pre-selects the region option again each time it opens', async () => {
    const wrapper = mountModal()
    await regionOption(wrapper).setValue(false)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(regionOption(wrapper).element.checked).toBe(true)
  })

  it('cancels', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="merge-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})
