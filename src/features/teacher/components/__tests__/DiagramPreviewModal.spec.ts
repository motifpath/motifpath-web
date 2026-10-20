import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DiagramPreviewModal from '@/features/teacher/components/DiagramPreviewModal.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

describe('DiagramPreviewModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(DiagramPreviewModal, {
      props: {
        open: false,
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        labelMode: 'interval',
      },
    })

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)
  })

  it('mounts the real FrettedDiagramView at full width when open', () => {
    const wrapper = mount(DiagramPreviewModal, {
      props: {
        open: true,
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        labelMode: 'interval',
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(makeFrettedDiagram().positions.length)
  })

  it('forwards labelMode through to the viewer', () => {
    const wrapper = mount(DiagramPreviewModal, {
      props: {
        open: true,
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        labelMode: 'note',
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position-label"]')[0]?.text()).toBe('A')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(DiagramPreviewModal, {
      props: {
        open: true,
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        labelMode: 'interval',
      },
    })

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
