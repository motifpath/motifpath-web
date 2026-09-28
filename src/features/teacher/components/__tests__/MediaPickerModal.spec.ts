import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import MediaPickerModal from '@/features/teacher/components/MediaPickerModal.vue'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const chord: DiagramRef = { diagram_id: 'd-e-major', layers: { label: 'custom' } }

function mountModal(props: Record<string, unknown> = {}) {
  return mount(MediaPickerModal, {
    props: { open: true, initialDiagram: null, ...props },
    global: { stubs: { teleport: true, DiagramEmbedPicker: true } },
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
    const wrapper = mountModal({ answers: true })

    await wrapper.get('[data-test="media-tab-diagram"]').trigger('click')
    const picker = wrapper.getComponent(DiagramEmbedPicker)
    expect(picker.props()).toEqual(expect.objectContaining({ initial: null, answers: true }))
    expect(wrapper.get('[data-test="media-apply"]').attributes('disabled')).toBeDefined()

    picker.vm.$emit('change', chord)
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-test="media-apply"]').trigger('click')

    expect(wrapper.emitted('diagram')).toEqual([[chord]])
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
