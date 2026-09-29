import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

  it('numbers no fret below 0, even with open strings, and draws open-string markers on the nut', () => {
    const diagram = makeFrettedDiagram({
      positions: [
        { position_id: 'p0', string: 2, fret: 0, interval: '7', note_name: 'B', shape: 'dot' },
        { position_id: 'p1', string: 5, fret: 3, interval: 'R', note_name: 'C', shape: 'dot' },
      ],
      regions: [],
    })
    const wrapper = mount(FrettedDiagramView, {
      props: { diagram, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
    })

    const fretNumbers = wrapper.findAll('[data-test="fret-number"]').map((n) => Number(n.text()))
    expect(fretNumbers[0]).toBe(0)
    expect(Math.min(...fretNumbers)).toBe(0)
    const nutX = Number(wrapper.findAll('[data-test="fret-number"]')[0]!.attributes('x'))
    const openMarker = wrapper.findAll('[data-test="diagram-position"]')[0]!
    expect(Number(openMarker.attributes('cx'))).toBeCloseTo(nutX)
    // Strings start at the nut too: nothing is drawn left of it.
    for (const string of wrapper.findAll('[data-test="diagram-string"]')) {
      expect(Number(string.attributes('x1'))).toBeCloseTo(nutX)
    }
  })

  it('starts the wood at the nut, leaving the open-string area bare', () => {
    const openDiagram = makeFrettedDiagram({
      positions: [
        { position_id: 'p0', string: 2, fret: 0, interval: '7', note_name: 'B', shape: 'dot' },
        { position_id: 'p1', string: 5, fret: 3, interval: 'R', note_name: 'C', shape: 'dot' },
      ],
      regions: [],
    })
    const open = mount(FrettedDiagramView, {
      props: { diagram: openDiagram, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
    })
    const nutX = Number(open.findAll('[data-test="fret-number"]')[0]!.attributes('x'))
    const wood = open.get('[data-test="fretboard-wood"]')
    const woodEnd = Number(wood.attributes('x')) + Number(wood.attributes('width'))

    expect(Number(wood.attributes('x'))).toBe(nutX)
    // Still reaches the right end of the board.
    const lastFretX = Number(open.findAll('[data-test="fret-number"]').at(-1)!.attributes('x'))
    expect(woodEnd).toBeGreaterThanOrEqual(lastFretX)

    // Up the neck, with no open strings, the wood covers the whole window.
    const closed = mount(FrettedDiagramView, {
      props: { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
    })
    const firstWire = closed.findAll('[data-test="fret-wire"]')[0]!
    const firstFretX = Number(firstWire.attributes('x')) + Number(firstWire.attributes('width')) / 2
    expect(Number(closed.get('[data-test="fretboard-wood"]').attributes('x'))).toBeCloseTo(firstFretX)
  })

  it('renders an accessible label on the root svg element', () => {
    const wrapper = mount(FrettedDiagramView, {
      props: {
        diagram: makeFrettedDiagram(),
        instrument: makeFrettedInstrument(),
        diagramRef: makeDiagramRef(),
      },
    })

    expect(wrapper.get('[data-test="diagram-canvas"]').attributes('role')).toBe('img')
    expect(wrapper.get('[data-test="diagram-canvas"]').attributes('aria-label')).toBe(makeFrettedDiagram().names.en)
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

  describe('annotations', () => {
    function annotatedDiagram() {
      const base = makeFrettedDiagram()
      return makeFrettedDiagram({
        positions: base.positions.map((p, i) =>
          i === 1
            ? { ...p, custom_label: { en: 'Av', pt_BR: 'Ev' }, note: { en: 'Avoid holding this over Am7', pt_BR: 'Evite sustentar sobre Am7' } }
            : p,
        ),
      })
    }

    function mountAnnotated(labelMode: 'interval' | 'note' | 'hidden' = 'interval') {
      return mount(FrettedDiagramView, {
        props: { diagram: annotatedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef(), labelMode },
        attachTo: document.body,
      })
    }

    it("shows a position's custom label instead of its interval or note name", () => {
      const labels = (mode: 'interval' | 'note') =>
        mountAnnotated(mode).findAll('[data-test="diagram-position-label"]').map((l) => l.text())

      expect(labels('interval')).toEqual(['R', 'Av', '4', '5', 'b7', 'R'])
      expect(labels('note')).toEqual(['A', 'Av', 'D', 'E', 'G', 'A'])
    })

    it('hides custom labels too when labels are hidden', () => {
      expect(mountAnnotated('hidden').findAll('[data-test="diagram-position-label"]')).toHaveLength(0)
    })

    it("shows custom labels and notes in the reader's language", async () => {
      i18n.global.locale.value = 'pt-BR'
      try {
        const wrapper = mountAnnotated()

        expect(wrapper.findAll('[data-test="diagram-position-label"]')[1]?.text()).toBe('Ev')
        await wrapper.get('[data-test="diagram-noted-marker"]').trigger('mouseenter')
        expect(wrapper.get('[data-test="diagram-note"]').text()).toBe('Evite sustentar sobre Am7')
      } finally {
        i18n.global.locale.value = 'en'
      }
    })

    it('marks only a position with a note with a badge, and makes it focusable', () => {
      const wrapper = mountAnnotated()

      expect(wrapper.findAll('[data-test="diagram-note-badge"]')).toHaveLength(1)
      expect(wrapper.findAll('[data-test="diagram-noted-marker"]')).toHaveLength(1)
      expect(wrapper.get('[data-test="diagram-noted-marker"]').attributes('tabindex')).toBe('0')
    })

    it("describes the marker with its note for screen readers, before it's ever shown", () => {
      const wrapper = mountAnnotated()
      const marker = wrapper.get('[data-test="diagram-noted-marker"]')
      const describedBy = marker.attributes('aria-describedby')

      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy ?? '')?.textContent?.trim()).toBe('Avoid holding this over Am7')
      expect(wrapper.get('[data-test="diagram-note"]').isVisible()).toBe(false)
    })

    it('shows the note while the marker is hovered or focused', async () => {
      const wrapper = mountAnnotated()
      const marker = wrapper.get('[data-test="diagram-noted-marker"]')
      const note = () => wrapper.get('[data-test="diagram-note"]')

      await marker.trigger('mouseenter')
      expect(note().isVisible()).toBe(true)
      await marker.trigger('mouseleave')
      expect(note().isVisible()).toBe(false)

      await marker.trigger('focus')
      expect(note().isVisible()).toBe(true)
      await marker.trigger('blur')
      expect(note().isVisible()).toBe(false)
    })

    it('keeps a tapped note open until something else is tapped or Escape is pressed', async () => {
      const wrapper = mountAnnotated()
      const marker = wrapper.get('[data-test="diagram-noted-marker"]')
      const note = () => wrapper.get('[data-test="diagram-note"]')

      await marker.trigger('click')
      expect(note().isVisible()).toBe(true)
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(note().isVisible()).toBe(false)

      await marker.trigger('click')
      await marker.trigger('keydown', { key: 'Escape' })
      expect(note().isVisible()).toBe(false)
    })

    it('opens a note on an upper string below its marker, so the scrolling board never clips it', async () => {
      const note = { en: 'Mind the top string', pt_BR: 'Cuidado com a corda de cima' }
      const wrapper = mount(FrettedDiagramView, {
        props: {
          diagram: makeFrettedDiagram({
            positions: [
              { position_id: 'top', string: 1, fret: 5, interval: 'R', note_name: 'A', shape: 'dot', note },
              { position_id: 'bottom', string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'dot', note },
            ],
          }),
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef(),
        },
        attachTo: document.body,
      })
      const svgHeight = Number(wrapper.get('svg').attributes('height'))
      const placement = (index: number) => {
        const marker = wrapper.findAll('[data-test="diagram-position"]')[index]!
        const popover = wrapper.findAll('[data-test="diagram-note"]')[index]!
        return {
          markerTop: (Number(marker.attributes('cy')) / svgHeight) * 100,
          noteTop: parseFloat((popover.element as HTMLElement).style.top),
          opensUpward: popover.classes().includes('-translate-y-full'),
        }
      }

      const top = placement(0)
      expect(top.opensUpward).toBe(false)
      expect(top.noteTop).toBeGreaterThan(top.markerTop)

      const bottom = placement(1)
      expect(bottom.opensUpward).toBe(true)
      expect(bottom.noteTop).toBeLessThan(bottom.markerTop)
      wrapper.unmount()
    })

    it('leaves a diagram without notes a plain image', () => {
      const wrapper = mount(FrettedDiagramView, {
        props: { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
      })

      expect(wrapper.find('[data-test="diagram-note-badge"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="diagram-canvas"]').attributes('role')).toBe('img')
    })
  })

  describe('regions', () => {
    function mountWithRegions() {
      return mount(FrettedDiagramView, {
        props: {
          diagram: makeFrettedDiagram({
            regions: [
              { region_id: 'r1', fret_start: 5, fret_end: 8, description: { en: 'Box 1', pt_BR: 'Caixa 1' }, color: null },
              { region_id: 'r2', fret_start: 7, fret_end: 8, string_start: 1, string_end: 3, description: { en: 'Box 2' }, color: '#22C55E' },
            ],
          }),
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef(),
        },
      })
    }

    it('draws one band and one outline per region, in order, with no permanent caption', () => {
      const wrapper = mountWithRegions()

      expect(wrapper.findAll('[data-test="diagram-region"]')).toHaveLength(2)
      expect(wrapper.findAll('[data-test="region-outline"]')).toHaveLength(2)
      expect(wrapper.find('[data-test="diagram-region-caption"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="diagram-region-caption-bar"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
    })

    it('draws each band behind the markers it spans', () => {
      const wrapper = mountWithRegions()
      const svg = wrapper.get('[data-test="diagram-canvas"]').element
      const band = wrapper.findAll('[data-test="diagram-region"]')[0]!.element
      const firstMarker = wrapper.findAll('[data-test="diagram-position"]')[0]!.element

      // DOCUMENT_POSITION_FOLLOWING: the marker comes after the band, so it paints on top.
      expect(band.compareDocumentPosition(firstMarker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(svg.contains(band)).toBe(true)
    })

    it('spans the fret spaces from fret_start to fret_end, and only the given strings', () => {
      const wrapper = mountWithRegions()
      const [box1, box2] = wrapper.findAll('[data-test="diagram-region"]')
      const markers = wrapper.findAll('[data-test="diagram-position"]')
      const cx = (i: number) => Number(markers[i]!.attributes('cx'))
      const cy = (i: number) => Number(markers[i]!.attributes('cy'))
      const range = (el: typeof box1, attr: 'x' | 'y', size: 'width' | 'height') => {
        const start = Number(el!.attributes(attr))
        return [start, start + Number(el!.attributes(size))]
      }

      // Box 1 (frets 5-8, every string) holds the fret-5 and fret-8 markers on string 6.
      const [x1, x2] = range(box1, 'x', 'width')
      expect(cx(0)).toBeGreaterThan(x1!)
      expect(cx(1)).toBeLessThan(x2!)
      // Box 2 (strings 1-3) stops above string 4, where marker p4 sits.
      const [, y2] = range(box2, 'y', 'height')
      expect(cy(4)).toBeGreaterThan(y2!)
    })

    describe('a region from fret 0', () => {
      function mountFromOpen(fretEnd: number) {
        return mount(FrettedDiagramView, {
          props: {
            diagram: makeFrettedDiagram({
              positions: [
                { position_id: 'p0', string: 2, fret: 0, interval: '7', note_name: 'B', shape: 'dot' },
                { position_id: 'p1', string: 5, fret: 3, interval: 'R', note_name: 'C', shape: 'dot' },
              ],
              regions: [{ region_id: 'r1', fret_start: 0, fret_end: fretEnd, description: { en: 'Open' }, color: null }],
            }),
            instrument: makeFrettedInstrument(),
            diagramRef: makeDiagramRef(),
          },
        })
      }
      const fretLineX = (wrapper: ReturnType<typeof mountFromOpen>, fret: number) => {
        const line =
          fret === 0
            ? wrapper.get('[data-test="diagram-nut"]')
            : wrapper.findAll('[data-test="fret-wire"]').find((wire) => wire.attributes('data-fret') === String(fret))!
        return Number(line.attributes('x')) + Number(line.attributes('width')) / 2
      }

      it('starts at the nut, leaving the open-string area bare', () => {
        const wrapper = mountFromOpen(3)
        const band = wrapper.get('[data-test="diagram-region"]')

        expect(Number(band.attributes('x'))).toBeCloseTo(fretLineX(wrapper, 0))
        expect(Number(band.attributes('x')) + Number(band.attributes('width'))).toBeCloseTo(fretLineX(wrapper, 3))
      })

      it('surrounds the nut when it spans only the open strings, covering their markers', () => {
        const wrapper = mountFromOpen(0)
        const band = wrapper.get('[data-test="diagram-region"]')
        const openMarkerX = Number(wrapper.findAll('[data-test="diagram-position"]')[0]!.attributes('cx'))
        const left = Number(band.attributes('x'))
        const right = left + Number(band.attributes('width'))

        const radius = Number(wrapper.findAll('[data-test="diagram-position"]')[0]!.attributes('r'))
        expect(left).toBeLessThan(openMarkerX - radius)
        expect(right).toBeGreaterThan(openMarkerX + radius)
        expect(right).toBeLessThanOrEqual(fretLineX(wrapper, 1))
      })
    })

    it("tints a band with the region's color, else the default token", () => {
      const [box1, box2] = mountWithRegions().findAll('[data-test="diagram-region"]')

      expect(box2?.attributes('style')).toContain('fill: #22C55E')
      expect(box1?.attributes('style') ?? '').not.toContain('fill:')
      expect(box1?.classes()).toContain('fill-accent')
    })

    it("outlines a band in the region's color, else the default token", () => {
      const [outline1, outline2] = mountWithRegions().findAll('[data-test="region-outline"]')

      expect(outline2?.attributes('style')).toContain('stroke: #22C55E')
      expect(outline1?.classes()).toContain('stroke-accent')
    })

    it('keeps overlapping regions fully filled, with the later outline a parallel line inside', () => {
      const wrapper = mount(FrettedDiagramView, {
        props: {
          diagram: makeFrettedDiagram({
            regions: [
              { region_id: 'r1', fret_start: 5, fret_end: 8, description: { en: 'A' }, color: null },
              { region_id: 'r2', fret_start: 5, fret_end: 8, description: { en: 'B' }, color: null },
            ],
          }),
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef(),
        },
      })
      const [band1, band2] = wrapper.findAll('[data-test="diagram-region"]')
      const [outline1, outline2] = wrapper.findAll('[data-test="region-outline"]')
      const x = (el: typeof band1) => Number(el!.attributes('x'))
      const right = (el: typeof band1) => x(el) + Number(el!.attributes('width'))

      expect(band2!.attributes('x')).toBe(band1!.attributes('x'))
      expect(band2!.attributes('width')).toBe(band1!.attributes('width'))
      expect(x(outline1)).toBeCloseTo(x(band1))
      expect(x(outline2)).toBeGreaterThan(x(outline1))
      expect(right(outline2)).toBeLessThan(right(outline1))
    })

    describe('information controls and descriptions', () => {
      const three = makeFrettedDiagram({
        regions: [
          { region_id: 'r1', fret_start: 5, fret_end: 8, description: { en: 'Box 1', pt_BR: 'Caixa 1' }, color: '#3B82F6' },
          { region_id: 'r2', fret_start: 6, fret_end: 8, description: { en: 'Box 2', pt_BR: 'Caixa 2' }, color: null },
          { region_id: 'r3', fret_start: 7, fret_end: 8, description: { en: 'Box 3', pt_BR: 'Caixa 3' }, color: '#22C55E' },
        ],
      })
      const mountInfo = (props: Record<string, unknown> = {}) =>
        mount(FrettedDiagramView, {
          attachTo: document.body,
          props: { diagram: three, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef(), ...props },
        })
      const controls = (wrapper: ReturnType<typeof mountInfo>) => wrapper.findAll('[data-test="region-info"]')
      const leftPx = (el: { attributes: (name: string) => string | undefined }) =>
        Number(/left:\s*([-\d.]+)px/.exec(el.attributes('style') ?? '')![1])

      it("offers one control per region, named by its description in the reader's language", () => {
        i18n.global.locale.value = 'pt-BR'
        try {
          const wrapper = mountInfo()
          expect(controls(wrapper).map((c) => c.attributes('aria-label'))).toEqual(['Caixa 1', 'Caixa 2', 'Caixa 3'])
          expect(controls(wrapper).every((c) => c.attributes('aria-expanded') === 'false')).toBe(true)
          expect(controls(wrapper)[0]!.element.tagName).toBe('BUTTON')
        } finally {
          i18n.global.locale.value = 'en'
        }
      })

      it("colors each control like its region", () => {
        const [first, second] = controls(mountInfo())

        expect(first!.attributes('style')).toContain('color: rgb(59, 130, 246)')
        expect(second!.classes()).toContain('text-accent')
      })

      it('places a control near its region’s last fret, and controls sharing that fret side by side', () => {
        const wrapper = mountInfo()
        const wire8 = wrapper.findAll('[data-test="fret-wire"]').find((w) => w.attributes('data-fret') === '8')!
        const fret8 = Number(wire8.attributes('x')) + 1.5
        const lefts = controls(wrapper).map(leftPx).sort((a, b) => a - b)

        expect(lefts.at(-1)! + 44).toBeCloseTo(fret8)
        for (let index = 1; index < lefts.length; index++) expect(lefts[index]! - lefts[index - 1]!).toBeGreaterThanOrEqual(44)
      })

      it('widens the board rather than overlap the controls of many regions', () => {
        const crowded = makeFrettedDiagram({
          regions: Array.from({ length: 12 }, (_, index) => ({
            region_id: `r${index}`,
            fret_start: 5,
            fret_end: 8,
            description: { en: `Region ${index}` },
            color: null,
          })),
        })
        const wrapper = mountInfo({ diagram: crowded })

        expect(Number(wrapper.get('[data-test="diagram-canvas"]').attributes('width'))).toBeGreaterThanOrEqual(12 * 44)
        const lefts = controls(wrapper).map(leftPx).sort((a, b) => a - b)
        expect(lefts[0]).toBeGreaterThanOrEqual(0)
        for (let index = 1; index < lefts.length; index++) expect(lefts[index]! - lefts[index - 1]!).toBeGreaterThanOrEqual(44)
      })

      it('seats the controls right on top of the board, with no gap of their own', () => {
        const withRail = mountInfo()
        const withoutRail = mountInfo({ regionInfo: false })
        const woodTop = (wrapper: ReturnType<typeof mountInfo>) => Number(wrapper.get('[data-test="fretboard-wood"]').attributes('y'))

        expect(woodTop(withRail)).toBeLessThanOrEqual(2)
        expect(woodTop(withoutRail)).toBeGreaterThan(woodTop(withRail))
      })

      it('offers no controls on a static picture', () => {
        expect(controls(mountInfo({ regionInfo: false }))).toHaveLength(0)
      })

      it('opens a region’s description from its control, next to it', async () => {
        const wrapper = mountInfo()
        const control = controls(wrapper)[1]!

        await control.trigger('click')

        const description = wrapper.get('[data-test="region-description"]')
        expect(description.text()).toContain('Box 2')
        expect(control.attributes('aria-expanded')).toBe('true')
        expect(control.attributes('aria-controls')).toBe(description.attributes('id'))
      })

      it('points only the expanded control at the description, which exists only while open', async () => {
        const wrapper = mountInfo()
        expect(controls(wrapper).some((c) => c.attributes('aria-controls') !== undefined)).toBe(false)

        await controls(wrapper)[0]!.trigger('click')

        expect(controls(wrapper).map((c) => c.attributes('aria-controls') !== undefined)).toEqual([true, false, false])
      })

      it('points the description at the control that opened it', async () => {
        const wrapper = mountInfo()
        const control = controls(wrapper)[0]!
        await control.trigger('click')

        const description = wrapper.get('[data-test="region-description"]')
        const pointer = leftPx(description.get('[data-test="region-description-arrow"]'))
        // The arrow is a 10 px square; its middle lines up with the control's middle.
        expect(leftPx(description) + pointer + 5).toBeCloseTo(leftPx(control) + 22)
      })

      it('opens a description by tapping the region itself', async () => {
        const wrapper = mountInfo()

        await wrapper.findAll('[data-test="diagram-region"]')[0]!.trigger('click')

        expect(wrapper.get('[data-test="region-description"]').text()).toContain('Box 1')
      })

      it('shows one description at a time', async () => {
        const wrapper = mountInfo()

        await controls(wrapper)[0]!.trigger('click')
        await controls(wrapper)[2]!.trigger('click')

        expect(wrapper.findAll('[data-test="region-description"]')).toHaveLength(1)
        expect(wrapper.get('[data-test="region-description"]').text()).toContain('Box 3')
        expect(controls(wrapper)[0]!.attributes('aria-expanded')).toBe('false')
      })

      it('closes from its close control, returning focus to the region control', async () => {
        const wrapper = mountInfo()
        await controls(wrapper)[0]!.trigger('click')

        await wrapper.get('[data-test="region-description-close"]').trigger('click')

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
        expect(document.activeElement).toBe(controls(wrapper)[0]!.element)
      })

      it('closes when its control is activated again', async () => {
        const wrapper = mountInfo()
        await controls(wrapper)[0]!.trigger('click')
        await controls(wrapper)[0]!.trigger('click')

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
      })

      it('closes on Escape, returning focus to the region control', async () => {
        const wrapper = mountInfo()
        await controls(wrapper)[1]!.trigger('click')

        await wrapper.get('[data-test="region-description"]').trigger('keydown', { key: 'Escape' })

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
        expect(document.activeElement).toBe(controls(wrapper)[1]!.element)
      })

      it('closes on a press outside it and its control, without taking focus', async () => {
        const wrapper = mountInfo()
        const outside = document.createElement('button')
        document.body.appendChild(outside)
        await controls(wrapper)[0]!.trigger('click')
        outside.focus()

        outside.dispatchEvent(new Event('pointerdown', { bubbles: true }))
        outside.dispatchEvent(new Event('click', { bubbles: true }))
        await nextTick()

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
        expect(document.activeElement).toBe(outside)
        outside.remove()
      })

      it('stays open while the board is swiped or its scrollbar dragged', async () => {
        const wrapper = mountInfo()
        await controls(wrapper)[0]!.trigger('click')

        // A swipe or a scrollbar drag presses on the board without ever clicking it.
        await wrapper.get('[data-test="diagram-canvas"]').trigger('pointerdown')
        await wrapper.get('[data-test="board-scroll"]').trigger('pointerdown')
        await wrapper.get('[data-test="board-scroll"]').trigger('scroll')

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(true)
      })

      it("closes when another diagram's region control is pressed", async () => {
        const props = { diagram: three, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() }
        const page = mount(defineComponent({ render: () => [h(FrettedDiagramView, props), h(FrettedDiagramView, props)] }), {
          attachTo: document.body,
        })
        const [first, second] = page.findAllComponents(FrettedDiagramView)
        await first!.findAll('[data-test="region-info"]')[0]!.trigger('click')

        await second!.findAll('[data-test="region-info"]')[0]!.trigger('click')

        expect(first!.find('[data-test="region-description"]').exists()).toBe(false)
        expect(second!.find('[data-test="region-description"]').exists()).toBe(true)
      })

      it('still selects a note tapped outside an open description', async () => {
        const wrapper = mountInfo({ selectablePositionIds: ['p0'] })
        await controls(wrapper)[0]!.trigger('click')
        const choice = wrapper.get('[data-test="diagram-choice"]')

        await choice.trigger('pointerdown')
        await choice.trigger('click')

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
        expect(wrapper.emitted('select')).toEqual([['p0']])
      })

      it('keeps the description inside the visible part of a scrolled board', async () => {
        const wrapper = mountInfo()
        const scroller = wrapper.get('[data-test="board-scroll"]')
        ;(scroller.element as HTMLElement).scrollLeft = 300
        await scroller.trigger('scroll')

        await controls(wrapper)[0]!.trigger('click')

        expect(leftPx(wrapper.get('[data-test="region-description"]'))).toBeGreaterThanOrEqual(300)
      })

      it('closes the description when another diagram is shown', async () => {
        const wrapper = mountInfo()
        await controls(wrapper)[0]!.trigger('click')

        await wrapper.setProps({ diagram: makeFrettedDiagram({ regions: three.regions }) })

        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
      })

      it('keeps its controls usable while the drawing itself is inert', async () => {
        const wrapper = mountInfo({ drawingInert: true })

        expect(wrapper.get('[data-test="diagram-canvas"]').attributes()).toHaveProperty('inert')
        await controls(wrapper)[0]!.trigger('click')
        expect(wrapper.find('[data-test="region-description"]').exists()).toBe(true)
      })

      it('keeps a press on its controls from reaching whatever holds the diagram', async () => {
        const onClick = vi.fn()
        const holder = mount(
          defineComponent({
            render: () =>
              h('div', { onClick }, [
                h(FrettedDiagramView, { diagram: three, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() }),
              ]),
          }),
          { attachTo: document.body },
        )

        await holder.findAll('[data-test="region-info"]')[0]!.trigger('click')
        await holder.get('[data-test="region-description-close"]').trigger('click')

        expect(onClick).not.toHaveBeenCalled()
      })
    })
  })

  describe('answer choices', () => {
    function mountChoices(props: Record<string, unknown> = {}, diagram = makeFrettedDiagram()) {
      return mount(FrettedDiagramView, {
        props: {
          diagram,
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef({ layers: { intervals: false } }),
          selectablePositionIds: ['p0', 'p1', 'p5'],
          ...props,
        },
        attachTo: document.body,
      })
    }

    it('makes no marker a choice unless asked to', () => {
      const wrapper = mount(FrettedDiagramView, {
        props: { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
      })

      expect(wrapper.findAll('[data-test="diagram-choice"]')).toHaveLength(0)
    })

    it('makes only the selectable markers focusable radio choices', () => {
      const choices = mountChoices().findAll('[data-test="diagram-choice"]')

      expect(choices).toHaveLength(3)
      expect(choices.map((c) => c.attributes('role'))).toEqual(['radio', 'radio', 'radio'])
      expect(choices.map((c) => c.attributes('tabindex'))).toEqual(['0', '0', '0'])
      expect(choices.map((c) => c.attributes('aria-checked'))).toEqual(['false', 'false', 'false'])
    })

    it('uses checkbox choices when several may be picked', () => {
      const choices = mountChoices({ multiple: true }).findAll('[data-test="diagram-choice"]')

      expect(choices.map((c) => c.attributes('role'))).toEqual(['checkbox', 'checkbox', 'checkbox'])
    })

    it("names a choice by where it sits, never by its interval, which could give the answer away", () => {
      const first = mountChoices().get('[data-test="diagram-choice"]')

      expect(first.attributes('aria-label')).toBe('String 6, fret 5')
    })

    it('emits select with the position id on click, Enter and Space', async () => {
      const wrapper = mountChoices()
      const choices = wrapper.findAll('[data-test="diagram-choice"]')

      await choices[0]!.trigger('click')
      await choices[1]!.trigger('keydown', { key: 'Enter' })
      await choices[2]!.trigger('keydown', { key: ' ' })

      expect(wrapper.emitted('select')).toEqual([['p0'], ['p1'], ['p5']])
    })

    it('marks selected choices as checked, with a check badge', () => {
      const wrapper = mountChoices({ selectedPositionIds: ['p5'] })
      const choices = wrapper.findAll('[data-test="diagram-choice"]')

      expect(choices.map((c) => c.attributes('aria-checked'))).toEqual(['false', 'false', 'true'])
      expect(wrapper.findAll('[data-test="diagram-choice-selected"]')).toHaveLength(1)
      expect(choices[2]!.find('[data-test="diagram-choice-selected"]').exists()).toBe(true)
    })

    it('gives each choice a larger invisible tap target than its marker', () => {
      const target = mountChoices().get('[data-test="diagram-choice"] [data-test="diagram-choice-target"]')

      expect(Number(target.attributes('r'))).toBeGreaterThan(13.5)
    })

    it('selects a noted choice on click instead of pinning its note', async () => {
      const base = makeFrettedDiagram()
      const diagram = makeFrettedDiagram({
        positions: base.positions.map((p) => (p.position_id === 'p1' ? { ...p, note: { en: 'Blue note', pt_BR: 'Nota blue' } } : p)),
      })
      const wrapper = mountChoices({}, diagram)
      const noted = wrapper.findAll('[data-test="diagram-choice"]')[1]!

      await noted.trigger('click')

      expect(wrapper.emitted('select')).toEqual([['p1']])
      expect(wrapper.get('[data-test="diagram-note"]').isVisible()).toBe(false)
    })

    it('still shows a noted choice\'s note on hover', async () => {
      const base = makeFrettedDiagram()
      const diagram = makeFrettedDiagram({
        positions: base.positions.map((p) => (p.position_id === 'p1' ? { ...p, note: { en: 'Blue note', pt_BR: 'Nota blue' } } : p)),
      })
      const wrapper = mountChoices({}, diagram)

      await wrapper.findAll('[data-test="diagram-choice"]')[1]!.trigger('mouseenter')

      expect(wrapper.get('[data-test="diagram-note"]').isVisible()).toBe(true)
    })

    it('exposes its choices to assistive technology: a radiogroup for one pick, never a presentational image', () => {
      const single = mountChoices().get('[data-test="diagram-canvas"]')
      const multiple = mountChoices({ multiple: true }).get('[data-test="diagram-canvas"]')

      expect(single.attributes('role')).toBe('radiogroup')
      expect(multiple.attributes('role')).toBe('group')
    })

    it("still shows a noted marker's note on hover after a plain choice took focus", async () => {
      const base = makeFrettedDiagram()
      const diagram = makeFrettedDiagram({
        positions: base.positions.map((p) => (p.position_id === 'p1' ? { ...p, note: { en: 'Blue note', pt_BR: 'Nota blue' } } : p)),
      })
      const wrapper = mountChoices({}, diagram)
      const choices = wrapper.findAll('[data-test="diagram-choice"]')

      await choices[0]!.trigger('focus')
      await choices[1]!.trigger('mouseenter')

      expect(wrapper.get('[data-test="diagram-note"]').isVisible()).toBe(true)
    })
  })

  describe('per-use labels, hidden positions and answer cells', () => {
    const labelled = () =>
      makeFrettedDiagram({
        positions: makeFrettedDiagram().positions.map((p, i) => (i === 1 ? { ...p, custom_label: { en: 'Av' } } : p)),
      })
    const labels = (wrapper: ReturnType<typeof mount>) =>
      wrapper.findAll('[data-test="diagram-position-label"]').map((l) => l.text())

    it('draws the label mode the ref chooses, whatever the diagram’s own display', () => {
      const mountWith = (label: 'interval' | 'note' | 'custom' | 'none') =>
        mount(FrettedDiagramView, {
          props: { diagram: labelled(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef({ layers: { label } }), labelMode: 'hidden' },
        })

      expect(labels(mountWith('interval'))).toEqual(['R', 'b3', '4', '5', 'b7', 'R'])
      expect(labels(mountWith('note'))).toEqual(['A', 'C', 'D', 'E', 'G', 'A'])
      expect(labels(mountWith('custom'))).toEqual(['Av'])
      expect(labels(mountWith('none'))).toEqual([])
    })

    it('falls back from a missing custom label to the diagram’s own display', () => {
      const wrapper = mount(FrettedDiagramView, {
        props: { diagram: labelled(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef({ layers: { label: 'custom' } }), labelMode: 'note' },
      })

      expect(labels(wrapper)).toEqual(['A', 'Av', 'D', 'E', 'G', 'A'])
    })

    it('leaves hidden positions out, or draws them faded for an author who asks', () => {
      const props = { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef({ layers: { hidden_position_ids: ['p0'] } }) }

      expect(mount(FrettedDiagramView, { props }).findAll('[data-test="diagram-position"]')).toHaveLength(5)
      const revealed = mount(FrettedDiagramView, { props: { ...props, revealHidden: true } })
      expect(revealed.findAll('[data-test="diagram-position"]')).toHaveLength(6)
      expect(revealed.findAll('[data-test="diagram-position-hidden"]')).toHaveLength(1)
    })

    it('lets an author pick hidden positions too', async () => {
      const wrapper = mount(FrettedDiagramView, {
        props: {
          diagram: makeFrettedDiagram(),
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef({ layers: { hidden_position_ids: ['p0'] } }),
          revealHidden: true,
          selectablePositionIds: ['p0', 'p1'],
          multiple: true,
        },
      })

      const choices = wrapper.findAll('[data-test="diagram-choice"]')
      expect(choices).toHaveLength(2)
      await choices[1]!.trigger('click')
      expect(wrapper.emitted('select')).toEqual([['p0']])
    })

    describe('the fret window', () => {
      const spread = makeFrettedDiagram({
        positions: [
          { position_id: 'low', string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'dot' },
          { position_id: 'high', string: 1, fret: 12, interval: '5', note_name: 'E', shape: 'dot' },
        ],
      })
      const fretNumbers = (extra: Record<string, unknown>) =>
        mount(FrettedDiagramView, {
          props: {
            diagram: spread,
            instrument: makeFrettedInstrument(),
            diagramRef: makeDiagramRef({ layers: { hidden_position_ids: ['low'] } }),
            ...extra,
          },
        })
          .findAll('[data-test="fret-number"]')
          .map((n) => n.text())

      it('zooms in on the drawn positions when some are hidden', () => {
        expect(fretNumbers({})).not.toContain('5')
      })

      it('keeps hidden positions in view for an author who reveals them', () => {
        expect(fretNumbers({ revealHidden: true })).toContain('5')
      })

      it('keeps hidden positions in view when cells are the answers, since a hidden one can be correct', () => {
        expect(fretNumbers({ answerCells: [{ optionId: 'o-6-5', string: 6, fret: 5 }] })).toContain('5')
      })

      it('widens the board to every answer cell, beyond the frets the diagram uses', () => {
        expect(fretNumbers({ answerCells: [{ optionId: 'o-1-13', string: 1, fret: 13 }] })).toContain('13')
      })
    })

    describe('answer cells', () => {
      const cells = [
        { optionId: 'o-6-5', string: 6, fret: 5 },
        { optionId: 'o-1-5', string: 1, fret: 5 },
        { optionId: 'o-6-0', string: 6, fret: 0 },
      ]
      const mountCells = (selected: string[] = [], multiple = true) =>
        mount(FrettedDiagramView, {
          props: {
            diagram: makeFrettedDiagram(),
            instrument: makeFrettedInstrument(),
            diagramRef: makeDiagramRef({ layers: { hidden_position_ids: ['p0'] } }),
            answerCells: cells,
            selectedAnswerIds: selected,
            multiple,
          },
        })

      it('makes every cell a choice named by where it sits, over the drawn markers', () => {
        const wrapper = mountCells()

        const targets = wrapper.findAll('[data-test="diagram-cell"]')
        expect(targets).toHaveLength(3)
        expect(targets[0]!.attributes('aria-label')).toBe('String 6, fret 5')
        expect(targets[0]!.attributes('role')).toBe('checkbox')
        expect(wrapper.findAll('[data-test="diagram-choice"]')).toHaveLength(0)
        expect(wrapper.get('[data-test="diagram-canvas"]').attributes('role')).toBe('group')
      })

      it('picks a cell by its option', async () => {
        const wrapper = mountCells([], false)

        await wrapper.findAll('[data-test="diagram-cell"]')[2]!.trigger('click')
        await wrapper.findAll('[data-test="diagram-cell"]')[1]!.trigger('keydown', { key: 'Enter' })

        expect(wrapper.emitted('selectAnswer')).toEqual([['o-6-0'], ['o-1-5']])
        expect(wrapper.findAll('[data-test="diagram-cell"]')[0]!.attributes('role')).toBe('radio')
      })

      it('marks the picked cells', () => {
        const wrapper = mountCells(['o-6-5'])

        const selected = wrapper.findAll('[data-test="diagram-cell-selected"]')
        expect(selected).toHaveLength(1)
        expect(wrapper.findAll('[data-test="diagram-cell"]')[0]!.attributes('aria-checked')).toBe('true')
      })
    })
  })

  describe('while the diagram plays', () => {
    const base = { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument() }

    it('rings nothing when nothing is sounding', () => {
      const wrapper = mount(FrettedDiagramView, { props: { ...base, diagramRef: makeDiagramRef() } })
      expect(wrapper.findAll('[data-test="diagram-position-playing"]')).toHaveLength(0)
    })

    it('rings each sounding marker', () => {
      const wrapper = mount(FrettedDiagramView, {
        props: { ...base, diagramRef: makeDiagramRef(), activePositionIds: ['p1', 'p3'] },
      })
      expect(wrapper.findAll('[data-test="diagram-position-playing"]')).toHaveLength(2)
    })

    it('never draws a position the usage hides, even while it sounds', () => {
      const diagramRef = makeDiagramRef({ layers: { hidden_position_ids: ['p0'] } })
      const wrapper = mount(FrettedDiagramView, { props: { ...base, diagramRef, activePositionIds: ['p0'] } })
      expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(5)
      expect(wrapper.findAll('[data-test="diagram-position-playing"]')).toHaveLength(0)
    })
  })

  describe('readable geometry', () => {
    /** Reports `width` as the board container's width, as a browser's layout would. */
    function stubContainerWidth(width: number) {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(private readonly callback: ResizeObserverCallback) {}
          observe(target: Element) {
            this.callback([{ contentRect: { width }, target } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver)
          }
          unobserve() {}
          disconnect() {}
        },
      )
    }
    afterEach(() => vi.unstubAllGlobals())

    const wide = makeFrettedDiagram({
      positions: [
        { position_id: 'low', string: 6, fret: 1, interval: 'R', note_name: 'F', shape: 'dot' },
        { position_id: 'high', string: 1, fret: 12, interval: '5', note_name: 'E', shape: 'dot' },
      ],
    })
    const mountAt = async (width: number, props: Record<string, unknown> = {}) => {
      stubContainerWidth(width)
      const wrapper = mount(FrettedDiagramView, {
        attachTo: document.body,
        props: { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef(), ...props },
      })
      await nextTick()
      return wrapper
    }
    const fretWireXs = (wrapper: Awaited<ReturnType<typeof mountAt>>) =>
      wrapper.findAll('[data-test="fret-wire"]').map((wire) => Number(wire.attributes('x')) + Number(wire.attributes('width')) / 2)

    it('draws the board at its real size, filling the width it is given', async () => {
      const wrapper = await mountAt(600)

      expect(Number(wrapper.get('[data-test="diagram-canvas"]').attributes('width'))).toBe(600)
    })

    it('gives every fret space the same width', async () => {
      const wires = fretWireXs(await mountAt(600))
      const gaps = wires.slice(1).map((x, index) => x - wires[index]!)

      expect(gaps.length).toBeGreaterThan(1)
      for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!)
    })

    it('grows a board that cannot fit wider than the screen, inside its own scroll area', async () => {
      const wrapper = await mountAt(320, { diagram: wide })

      expect(Number(wrapper.get('[data-test="diagram-canvas"]').attributes('width'))).toBeGreaterThan(320)
      expect(wrapper.get('[data-test="board-scroll"]').classes()).toContain('overflow-x-auto')
    })

    it('keeps fret numbers and marker text at least 14 px tall on a phone', async () => {
      const wrapper = await mountAt(320, { diagramRef: makeDiagramRef({ layers: { intervals: true } }) })

      const sizes = [
        ...wrapper.findAll('[data-test="fret-number"]'),
        ...wrapper.findAll('[data-test="diagram-position-label"]'),
      ].map((text) => Number(text.attributes('font-size')))
      expect(sizes.length).toBeGreaterThan(0)
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(14)
    })

    it('numbers each shown fret space under its middle, and the nut 0', async () => {
      const wrapper = await mountAt(600, { diagram: wide })

      const numbers = wrapper.findAll('[data-test="fret-number"]').map((n) => n.text())
      expect(numbers).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    })

    it('keeps an open-string marker whole, with a touch target apart from a fret-1 marker', async () => {
      const diagram = makeFrettedDiagram({
        positions: [
          { position_id: 'open', string: 6, fret: 0, interval: 'R', note_name: 'E', shape: 'dot' },
          { position_id: 'first', string: 6, fret: 1, interval: 'b2', note_name: 'F', shape: 'dot' },
        ],
      })
      const wrapper = await mountAt(320, { diagram, selectablePositionIds: ['open', 'first'] })

      const [open, first] = wrapper.findAll('[data-test="diagram-choice-target"]')
      const openX = Number(open!.attributes('cx'))
      expect(openX - Number(open!.attributes('r'))).toBeGreaterThanOrEqual(0)
      expect(Number(first!.attributes('cx')) - openX).toBeGreaterThanOrEqual(
        Number(open!.attributes('r')) + Number(first!.attributes('r')),
      )
    })

    it('scrolls a keyboard-focused answer into view', async () => {
      const wrapper = await mountAt(320, { diagram: wide, selectablePositionIds: ['high'] })
      const choice = wrapper.get('[data-test="diagram-choice"]')
      const scrollIntoView = vi.fn()
      ;(choice.element as Element & { scrollIntoView: typeof scrollIntoView }).scrollIntoView = scrollIntoView

      await choice.trigger('focusin')

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    })

    it('scales a compact drawing to fit, without scrolling or decoration', async () => {
      const wrapper = await mountAt(160, { diagram: wide, compact: true })

      const svg = wrapper.get('[data-test="diagram-canvas"]')
      expect(svg.attributes('width')).toBeUndefined()
      expect(svg.attributes('viewBox')).toBeDefined()
      expect(svg.classes()).toContain('w-full')
      expect(wrapper.find('[data-test="board-scroll"]').classes()).not.toContain('overflow-x-auto')
      expect(wrapper.find('[data-test="board-grain"]').exists()).toBe(false)
    })
  })

  describe('instrument materials', () => {
    const mountDiagram = (diagram = makeFrettedDiagram(), instrument = makeFrettedInstrument()) =>
      mount(FrettedDiagramView, { props: { diagram, instrument, diagramRef: makeDiagramRef() } })
    const openDiagram = makeFrettedDiagram({
      positions: [{ position_id: 'open', string: 6, fret: 0, interval: 'R', note_name: 'E', shape: 'dot' }],
    })

    it('draws a nut only when the board starts at fret 0', () => {
      expect(mountDiagram(openDiagram).find('[data-test="diagram-nut"]').exists()).toBe(true)
      expect(mountDiagram().find('[data-test="diagram-nut"]').exists()).toBe(false)
    })

    it('draws inlays only in the fret spaces the board shows: single ones, and a double at 12', () => {
      const diagram = makeFrettedDiagram({
        positions: [
          { position_id: 'a', string: 6, fret: 4, interval: 'R', note_name: 'G#', shape: 'dot' },
          { position_id: 'b', string: 1, fret: 12, interval: '5', note_name: 'E', shape: 'dot' },
        ],
      })
      const inlays = mountDiagram(diagram).findAll('[data-test="fret-inlay"]').map((dot) => dot.attributes('data-fret'))

      // The board starts at the wire of fret 3, so fret space 3 isn't shown.
      expect(inlays).toEqual(['5', '7', '9', '12', '12'])
    })

    it('draws strings thicker as their open pitch gets lower', () => {
      const widths = mountDiagram()
        .findAll('[data-test="diagram-string"]')
        .map((string) => Number(string.attributes('stroke-width')))

      for (let index = 1; index < widths.length; index++) expect(widths[index]!).toBeGreaterThan(widths[index - 1]!)
    })

    it('draws every string alike on an instrument without a tuning', () => {
      const widths = mountDiagram(makeFrettedDiagram(), makeFrettedInstrument({ tuning: undefined }))
        .findAll('[data-test="diagram-string"]')
        .map((string) => string.attributes('stroke-width'))

      expect(new Set(widths).size).toBe(1)
    })

    it('draws metal fret wires and a wood grain', () => {
      const wrapper = mountDiagram()

      expect(wrapper.find('[data-test="board-grain"]').exists()).toBe(true)
      const wire = wrapper.get('[data-test="fret-wire"]')
      expect(wire.attributes('fill')).toMatch(/^url\(#.+-metal\)$/)
    })

    it('keeps its own paint ids when the same diagram is drawn twice on a page', () => {
      const props = { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() }
      const page = mount(defineComponent({ render: () => [h(FrettedDiagramView, props), h(FrettedDiagramView, props)] }))

      const fills = page.findAll('[data-test="fretboard-wood"]').map((wood) => wood.attributes('fill'))
      expect(fills).toHaveLength(2)
      expect(fills[0]).not.toBe(fills[1])
    })
  })

  describe('marker states', () => {
    it('shows selected, focused and sounding at once, the sounding glow behind the marker', async () => {
      const wrapper = mount(FrettedDiagramView, {
        props: {
          diagram: makeFrettedDiagram(),
          instrument: makeFrettedInstrument(),
          diagramRef: makeDiagramRef({ layers: { intervals: true } }),
          selectablePositionIds: ['p0'],
          selectedPositionIds: ['p0'],
          activePositionIds: ['p0'],
        },
      })
      const choice = wrapper.get('[data-test="diagram-choice"]')

      await choice.trigger('focus')

      expect(choice.find('[data-test="diagram-choice-selected"]').exists()).toBe(true)
      expect(choice.find('[data-test="diagram-focus-ring"]').exists()).toBe(true)
      const parts = choice.findAll('[data-test]').map((part) => part.attributes('data-test'))
      expect(parts.indexOf('diagram-position-playing')).toBeGreaterThanOrEqual(0)
      expect(parts.indexOf('diagram-position-playing')).toBeLessThan(parts.indexOf('diagram-position'))
      expect(choice.get('[data-test="diagram-position-label"]').text()).toBe('R')
    })

    it('outlines every marker, so an authored color close to the wood stays distinguishable', () => {
      const diagram = makeFrettedDiagram()
      diagram.positions[0]!.color = '#C49E6E'
      const wrapper = mount(FrettedDiagramView, {
        props: { diagram, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
      })

      const marker = wrapper.get('[data-test="diagram-position"]')
      expect(Number(marker.attributes('stroke-width'))).toBeGreaterThan(0)
      expect(marker.attributes('style')).toContain('fill: #C49E6E')
    })
  })
})
