import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import {
  makeDiagramRef,
  makeFrettedDiagram,
  makeFrettedInstrument,
} from '@/shared/testUtils/diagram'

describe('FrettedDiagramView', () => {
  it('renders one shape per diagram position', () => {
    const diagram = makeFrettedDiagram()
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram,
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef(),
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(diagram.positions.length)
  })

  it('shows interval labels when layers.intervals is true', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({ layers: { intervals: true } }),
      },
    })

    const labels = wrapper.findAll('[data-test="diagram-position-label"]')
    expect(labels).toHaveLength(6)
    expect(labels[0]?.text()).toBe('R')
  })

  it('hides interval labels when layers.intervals is false', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({ layers: { intervals: false } }),
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position-label"]')).toHaveLength(0)
  })

  it('only renders positions matching layers.subset', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({ layers: { intervals: true, subset: ['R'] } }),
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(2)
  })

  it('applies the author-chosen root color, falling back to the design token when unset', () => {
    const withOverride = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({
          layers: { intervals: true },
          styling: { root_color: '#c0392b' },
        }),
      },
    })
    const root = withOverride.findAll('[data-test="diagram-position"]')[0]
    expect(root?.attributes('style')).toContain('fill: #c0392b')

    const withoutOverride = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef(),
      },
    })
    const defaultRoot = withoutOverride.findAll('[data-test="diagram-position"]')[0]
    expect(defaultRoot?.classes()).toContain('fill-accent')
  })

  it('renders an accessible label on the root svg element', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef(),
      },
    })

    expect(wrapper.get('svg').attributes('role')).toBe('img')
    expect(wrapper.get('svg').attributes('aria-label')).toBe(makeFrettedDiagram().name)
  })
})
