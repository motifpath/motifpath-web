import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
import MediaPickerModal from '@/features/teacher/components/MediaPickerModal.vue'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const chord: DiagramRef = { diagram_id: 'd-e-major', layers: { label: 'custom' } }

function mountModal(props: Record<string, unknown> = {}) {
  return mount(MediaPickerModal, {
    props: { open: true, initialDiagram: null, ...props },
    global: { stubs: { DiagramEmbedPicker: true, DiagramPickerList: true } },
  })
}

describe('MediaPickerModal', () => {
  it('renders nothing while closed', () => {
    expect(mountModal({ open: false }).find('[data-test="media-picker"]').exists()).toBe(false)
  })

  it('starts on the image tab, taking an uploaded image at once', async () => {
    const wrapper = mountModal()
    expect(wrapper.get('[data-test="media-tab-image"]').attributes('aria-selected')).toBe('true')

    const file = new File(['x'], 'fret.png', { type: 'image/png' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')

    expect(wrapper.emitted('image')).toEqual([[file]])
  })

  it('picks a diagram on the diagram tab, applied only once one is chosen', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="media-tab-diagram"]').trigger('click')
    const picker = wrapper.getComponent(DiagramEmbedPicker)
    expect(picker.props('initial')).toBeNull()
    expect(wrapper.get('[data-test="media-apply"]').attributes('disabled')).toBeDefined()

    picker.vm.$emit('change', chord)
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-test="media-apply"]').trigger('click')

    expect(wrapper.emitted('diagram')).toEqual([[chord]])
  })

  it('for a stimulus, takes a diagram as soon as it is picked, its answers set in the form', async () => {
    const wrapper = mountModal({ chooseOnly: true })

    await wrapper.get('[data-test="media-tab-diagram"]').trigger('click')
    expect(wrapper.findComponent(DiagramEmbedPicker).exists()).toBe(false)
    expect(wrapper.find('[data-test="media-apply"]').exists()).toBe(false)

    wrapper.getComponent(DiagramPickerList).vm.$emit('select', makeFrettedDiagram({ diagram_id: 'd-penta' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('diagram')).toEqual([
      [{ diagram_id: 'd-penta', layers: { label: 'custom', intervals: true }, correct_position_ids: [] }],
    ])
  })

  it('reopens on the diagram tab with the diagram already chosen', () => {
    const wrapper = mountModal({ initialDiagram: chord })

    expect(wrapper.get('[data-test="media-tab-diagram"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.getComponent(DiagramEmbedPicker).props('initial')).toEqual(chord)
  })

  it('closes on cancel', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="media-cancel"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
