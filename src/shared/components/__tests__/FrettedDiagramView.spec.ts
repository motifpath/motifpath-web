import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'
import { LABEL_TEXT_DARK, LABEL_TEXT_LIGHT } from '@/shared/utils/diagramColors'
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

  it("labels intervals in the reader's language", () => {
    i18n.global.locale.value = 'pt-BR'
    try {
      const wrapper = mount(FrettedDiagramView, {
        props: {
          diagram: makeFrettedDiagram(),
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef({ layers: { intervals: true } }),
        },
      })

      const labels = wrapper.findAll('[data-test="diagram-position-label"]').map((l) => l.text())
      expect(labels).toEqual(['T', '3m', '4J', '5J', '7m', 'T'])
    } finally {
      i18n.global.locale.value = 'en'
    }
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

  it('sets the marker fill directly on the circle, not via inherited currentColor', () => {
    // Regression guard: a bare fill="currentColor" on the circle would silently pick up
    // whatever `color` happens to be ambient on the page instead of the intended
    // root/interval color, since fill-accent/fill-ink set `fill`, not `color` — invisible in
    // isolation but capable of rendering a marker's label unreadable against its own circle.
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({ styling: { root_color: '#c0392b' } }),
      },
    })

    const circle = wrapper.find('[data-test="diagram-position"]')
    expect(circle.attributes('fill')).not.toBe('currentColor')
    expect(circle.attributes('style')).toContain('fill: #c0392b')
  })

  it('renders a position\'s marker shape as a square or star rather than always a dot', () => {
    const diagram = makeFrettedDiagram()
    diagram.positions[0]!.shape = 'star'
    diagram.positions[1]!.shape = 'square'
    const wrapper = mount(FrettedDiagramView, {
      props: { diagram, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
    })

    const markers = wrapper.findAll('[data-test="diagram-position"]')
    expect(markers[0]?.element.tagName).toBe('polygon')
    expect(markers[1]?.element.tagName).toBe('rect')
    expect(markers[2]?.element.tagName).toBe('circle')
  })

  it('hides every label when labelMode is "hidden"', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({ layers: { intervals: true } }),
        labelMode: 'hidden',
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position-label"]')).toHaveLength(0)
  })

  it('draws string 1 above string 6 (high string on top, matching tab convention)', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef(),
      },
    })

    // p0 is on string 6, p5 is on string 4 — both lower-numbered-string positions
    // (higher pitched) must sit above higher-numbered-string ones.
    const circles = wrapper.findAll('[data-test="diagram-position"]')
    const p0 = circles[0] // string 6
    const p4 = circles[4] // string 4
    expect(Number(p4?.attributes('cy'))).toBeLessThan(Number(p0?.attributes('cy')))
  })

  it('shows note names instead of intervals when labelMode is "note"', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef({ layers: { intervals: true } }),
        labelMode: 'note',
      },
    })

    expect(wrapper.findAll('[data-test="diagram-position-label"]')[0]?.text()).toBe('A')
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
    expect(wrapper.get('svg').attributes('aria-label')).toBe(makeFrettedDiagram().names.en)
  })

  describe('persisted colors', () => {
    function mountColored(diagramOverrides = {}, ref = makeDiagramRef()) {
      const base = makeFrettedDiagram()
      const diagram = makeFrettedDiagram({
        color: '#3B82F6',
        positions: base.positions.map((p, i) => (i === 0 ? { ...p, color: '#EF4444' } : p)),
        ...diagramOverrides,
      })
      return mount(FrettedDiagramView, {
        props: { diagram, instrument: makeFrettedInstrument(), diagramRef: ref },
      })
    }

    it("fills a marker with the diagram's general color, and a position's own color wins over it", () => {
      const wrapper = mountColored()
      const markers = wrapper.findAll('[data-test="diagram-position"]')

      expect(markers[0]?.attributes('style')).toContain('fill: #EF4444')
      expect(markers[1]?.attributes('style')).toContain('fill: #3B82F6')
      expect(markers[1]?.classes()).not.toContain('fill-ink')
    })

    it("lets a diagram_ref's styling override the persisted colors for that embedding", () => {
      const wrapper = mountColored({}, makeDiagramRef({ styling: { root_color: '#c0392b' } }))

      expect(wrapper.findAll('[data-test="diagram-position"]')[0]?.attributes('style')).toContain('fill: #c0392b')
    })

    it('keeps the label readable on a persisted color', () => {
      const wrapper = mountColored({ color: '#111827' })
      const labels = wrapper.findAll('[data-test="diagram-position-label"]')

      expect(labels[1]?.attributes('style')).toContain('fill: #F4F4F4')
      expect(labels[0]?.attributes('style')).toContain('fill: #1A1A1A')
    })

    it('uses the shared dark/light label colors on a styling override', () => {
      const wrapper = mountColored({}, makeDiagramRef({ styling: { root_color: '#c0392b', interval_color: '#2c3e50' } }))
      const labels = wrapper.findAll('[data-test="diagram-position-label"]')

      expect(labels[0]?.attributes('style')).toContain(`fill: ${LABEL_TEXT_DARK}`)
      expect(labels[1]?.attributes('style')).toContain(`fill: ${LABEL_TEXT_LIGHT}`)
    })

    it('falls back to the design tokens when no color is recorded', () => {
      const wrapper = mountColored({ color: null, positions: makeFrettedDiagram().positions })
      const marker = wrapper.findAll('[data-test="diagram-position"]')[1]

      expect(marker?.attributes('style') ?? '').not.toContain('fill:')
      expect(marker?.classes()).toContain('fill-ink')
    })
  })
})
