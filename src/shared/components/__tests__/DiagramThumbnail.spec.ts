import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramThumbnail from '@/shared/components/diagram/DiagramThumbnail.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

const guitar = makeFrettedInstrument()
const piano = makeFrettedInstrument({ instrument_id: 'instrument-piano', family: 'keyboard' })

describe('DiagramThumbnail', () => {
  it('draws the whole diagram as authored: every position, its own label choice', () => {
    const diagram = makeFrettedDiagram({ label_display: 'note' })

    const wrapper = mount(DiagramThumbnail, { props: { diagram, instruments: [guitar] } })

    const view = wrapper.getComponent(FrettedDiagramView)
    expect(view.props('diagram')).toEqual(diagram)
    expect(view.props('instrument')).toEqual(guitar)
    expect(view.props('labelMode')).toBe('note')
    expect(view.props('compact')).toBe(true)
    expect(view.props('diagramRef')).toEqual({ diagram_id: diagram.diagram_id, layers: { intervals: true, subset: null } })
  })

  it('is a picture only, never taking focus or clicks from its card', () => {
    const wrapper = mount(DiagramThumbnail, { props: { diagram: makeFrettedDiagram(), instruments: [guitar] } })

    expect(wrapper.get('[data-test="diagram-thumbnail"]').attributes('inert')).toBeDefined()
  })

  it('says there is no preview for an instrument it cannot draw yet', () => {
    const diagram = makeFrettedDiagram({ instrument_id: 'instrument-piano' })

    const wrapper = mount(DiagramThumbnail, { props: { diagram, instruments: [guitar, piano] } })

    expect(wrapper.findComponent(FrettedDiagramView).exists()).toBe(false)
    expect(wrapper.get('[data-test="diagram-thumbnail-none"]').text()).toBe('No preview')
  })

  it('says there is no preview while its instrument is unknown', () => {
    const wrapper = mount(DiagramThumbnail, { props: { diagram: makeFrettedDiagram(), instruments: [] } })

    expect(wrapper.find('[data-test="diagram-thumbnail-none"]').exists()).toBe(true)
  })
})
