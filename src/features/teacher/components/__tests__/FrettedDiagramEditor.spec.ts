import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import { i18n } from '@/i18n'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'
import {
  EDITOR_CAPTION_SPACE,
  EDITOR_PX_PER_FRET,
  EDITOR_VIEW_H,
  editorViewWidth,
  fretX,
  frettedEditorGeometry,
  stringY,
} from '@/shared/utils/frettedFretboardEditor'
import type { LocalPosition, LocalRegion } from '@/features/teacher/composables/useDiagramForm'
import type { StackLayer } from '@/shared/utils/flattenDiagramStack'

/** Makes clientX/clientY map 1:1 onto the SVG's own viewBox coordinates, since jsdom otherwise reports a zero-size bounding rect. */
function mockOneToOneBoundingRect(el: Element, width: number, height: number = EDITOR_VIEW_H) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

function makeLocalPosition(overrides: Partial<LocalPosition> = {}): LocalPosition {
  return { id: 'pos-1', string: 6, fret: 5, interval: 'R', noteName: 'A', shape: 'dot', color: null, sequenceIndex: null, customLabel: {}, note: {}, ...overrides }
}

function makeLocalRegion(overrides: Partial<LocalRegion> = {}): LocalRegion {
  return { id: 'region-1', fretStart: 5, fretEnd: 8, stringStart: null, stringEnd: null, description: { en: 'Box 1' }, color: null, ...overrides }
}

describe('FrettedDiagramEditor', () => {
  it('renders one marker per position', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition(), makeLocalPosition({ id: 'pos-2', fret: 8 })] },
    })

    expect(wrapper.findAll('[data-test="editor-position"]')).toHaveLength(2)
  })

  it('sets the marker fill directly on the circle, not via inherited currentColor', () => {
    // Regression guard: a bare fill="currentColor" would silently pick up whatever `color`
    // happens to be ambient on the page instead of the accent circle it's meant to be —
    // invisible in isolation but capable of rendering the label unreadable against its own
    // marker.
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()] },
    })

    const circle = wrapper.get('[data-test="editor-position"] circle')
    expect(circle.attributes('fill')).not.toBe('currentColor')
    expect(circle.classes()).toContain('fill-accent')
  })

  it('emits toggle-cell with the nearest string/fret when the fretboard is clicked', async () => {
    const instrument = makeFrettedInstrument()
    const wrapper = mount(FrettedDiagramEditor, { props: { instrument, positions: [] } })
    const geometry = frettedEditorGeometry(instrument.string_count ?? 6)

    const svg = wrapper.get('svg')
    mockOneToOneBoundingRect(svg.element, editorViewWidth(geometry))
    await svg.trigger('click', { clientX: fretX(5, geometry), clientY: stringY(3, geometry) })

    expect(wrapper.emitted('toggle-cell')).toEqual([[{ string: 3, fret: 5 }]])
  })

  it('does not emit toggle-cell for a click outside the fretboard bounds', async () => {
    const instrument = makeFrettedInstrument()
    const wrapper = mount(FrettedDiagramEditor, { props: { instrument, positions: [] } })
    const geometry = frettedEditorGeometry(instrument.string_count ?? 6)
    const svg = wrapper.get('svg')
    mockOneToOneBoundingRect(svg.element, editorViewWidth(geometry))

    await svg.trigger('click', { clientX: -500, clientY: -500 })

    expect(wrapper.emitted('toggle-cell')).toBeUndefined()
  })

  it('uses a plain pointer cursor, not a crosshair, for the clickable fretboard', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [] },
    })

    expect(wrapper.get('svg').classes()).toContain('cursor-pointer')
    expect(wrapper.get('svg').classes()).not.toContain('cursor-crosshair')
  })

  it('shows string 1 above string 6 (high string on top, matching tab convention)', () => {
    const instrument = makeFrettedInstrument()
    const geometry = frettedEditorGeometry(instrument.string_count ?? 6)
    const wrapper = mount(FrettedDiagramEditor, {
      props: {
        instrument,
        positions: [makeLocalPosition({ id: 'pos-1', string: 1, fret: 5 }), makeLocalPosition({ id: 'pos-2', string: 6, fret: 5 })],
      },
    })

    const markers = wrapper.findAll('[data-test="editor-position"] circle')
    expect(Number(markers[0]?.attributes('cy'))).toBeLessThan(Number(markers[1]?.attributes('cy')))
    expect(Number(markers[0]?.attributes('cy'))).toBeCloseTo(stringY(1, geometry))
    expect(Number(markers[1]?.attributes('cy'))).toBeCloseTo(stringY(6, geometry))
  })

  it('defaults to showing each position\'s interval, and switches to note name when labelMode is "note"', () => {
    const withInterval = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition({ interval: 'R', noteName: 'A' })] },
    })
    expect(withInterval.get('[data-test="editor-position"] text').text()).toBe('R')

    const withNote = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition({ interval: 'R', noteName: 'A' })], labelMode: 'note' },
    })
    expect(withNote.get('[data-test="editor-position"] text').text()).toBe('A')
  })

  it("labels intervals in the author's language, on the marker and in the position list", () => {
    i18n.global.locale.value = 'pt-BR'
    try {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition({ interval: 'b3', noteName: 'C' })] },
      })

      expect(wrapper.get('[data-test="editor-position"] text').text()).toBe('3m')
      expect(wrapper.get('[data-test="position-interval-input"]').text()).toBe('3m')
    } finally {
      i18n.global.locale.value = 'en'
    }
  })

  it('hides the marker label when labelMode is "hidden"', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()], labelMode: 'hidden' },
    })

    expect(wrapper.find('[data-test="editor-position"] text').exists()).toBe(false)
  })

  it('renders a position\'s marker as its own shape (dot/square/star)', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: {
        instrument: makeFrettedInstrument(),
        positions: [
          makeLocalPosition({ id: 'pos-1', shape: 'dot' }),
          makeLocalPosition({ id: 'pos-2', fret: 7, shape: 'square' }),
          makeLocalPosition({ id: 'pos-3', fret: 9, shape: 'star' }),
        ],
      },
    })

    const markers = wrapper.findAll('[data-test="editor-position"]')
    expect(markers[0]?.find('circle').exists()).toBe(true)
    expect(markers[1]?.find('rect').exists()).toBe(true)
    expect(markers[2]?.find('polygon').exists()).toBe(true)
  })

  it('emits set-shape when a shape option is clicked, without also selecting the row', async () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()] },
    })

    const starButton = wrapper.findAll('[data-test="position-shape-option"]')[2]!
    await starButton.trigger('click')

    expect(wrapper.emitted('set-shape')).toEqual([['pos-1', 'star']])
    expect(wrapper.findAll('[data-test="marker-highlight"]')).toHaveLength(0)
  })

  it('shows each position\'s interval and note name as read-only, not editable — they\'re computed from the root note', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition({ interval: 'b3', noteName: 'C' })] },
    })

    expect(wrapper.get('[data-test="position-interval-input"]').text()).toBe('b3')
    expect(wrapper.get('[data-test="position-note-name-input"]').text()).toBe('C')
    // Read-only display, not an input a teacher could type into.
    expect(wrapper.find('input[data-test="position-interval-input"]').exists()).toBe(false)
    expect(wrapper.find('input[data-test="position-note-name-input"]').exists()).toBe(false)
  })

  it('selects a position when its row is clicked and highlights the matching marker', async () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: {
        instrument: makeFrettedInstrument(),
        positions: [makeLocalPosition({ id: 'pos-1' }), makeLocalPosition({ id: 'pos-2', fret: 7 })],
      },
    })

    expect(wrapper.findAll('[data-test="marker-highlight"]')).toHaveLength(0)

    const rows = wrapper.findAll('[data-test="position-controls"]')
    await rows[1]?.trigger('click')

    const highlights = wrapper.findAll('[data-test="marker-highlight"]')
    expect(highlights).toHaveLength(1)
    expect(rows[1]?.classes()).toContain('border-accent')
    expect(rows[0]?.classes()).not.toContain('border-accent')
  })

  it('makes a position row keyboard-focusable and selects it on Enter/Space', async () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition({ id: 'pos-1' })] },
    })

    const row = wrapper.get('[data-test="position-controls"]')
    expect(row.attributes('tabindex')).toBe('0')
    expect(row.attributes('role')).toBe('button')

    await row.trigger('keydown', { key: 'Enter' })
    expect(wrapper.findAll('[data-test="marker-highlight"]')).toHaveLength(1)

    await row.trigger('keydown', { key: ' ' })
    expect(wrapper.findAll('[data-test="marker-highlight"]')).toHaveLength(0)
  })

  it('floats the fretboard so it stays visible while the position list scrolls', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [] },
    })

    expect(wrapper.get('[data-test="fretboard-scroll"]').classes()).toContain('sticky')
  })

  it('shows each position\'s sequence order (list position), not a free-typed number', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: {
        instrument: makeFrettedInstrument(),
        positions: [makeLocalPosition({ id: 'pos-1' }), makeLocalPosition({ id: 'pos-2', fret: 7 })],
      },
    })

    const badges = wrapper.findAll('[data-test="position-sequence-badge"]')
    expect(badges.map((b) => b.text())).toEqual(['1', '2'])
  })

  it('emits reorder with the dragged position\'s from/to index on drop', async () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: {
        instrument: makeFrettedInstrument(),
        positions: [
          makeLocalPosition({ id: 'pos-1' }),
          makeLocalPosition({ id: 'pos-2', fret: 7 }),
          makeLocalPosition({ id: 'pos-3', fret: 9 }),
        ],
      },
    })

    const items = wrapper.findAll('[data-test="position-controls"]')
    await items[0]?.trigger('dragstart')
    await items[2]?.trigger('drop')

    expect(wrapper.emitted('reorder')).toEqual([[0, 2]])
  })

  describe('colors', () => {
    it("fills markers with the diagram's general color, and a position's own color wins", () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: {
          instrument: makeFrettedInstrument(),
          color: '#3B82F6',
          positions: [makeLocalPosition({ id: 'pos-1', color: '#EF4444' }), makeLocalPosition({ id: 'pos-2', fret: 7 })],
        },
      })

      const markers = wrapper.findAll('[data-test="editor-position"]')
      expect(markers[0]?.find('circle').attributes('style')).toContain('fill: #EF4444')
      expect(markers[1]?.find('circle').attributes('style')).toContain('fill: #3B82F6')
      expect(markers[1]?.find('circle').classes()).not.toContain('fill-accent')
    })

    it('keeps the theme accent when no color is set', () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()] },
      })

      const circle = wrapper.find('[data-test="editor-position"] circle')
      expect(circle.classes()).toContain('fill-accent')
      expect(circle.attributes('style') ?? '').not.toContain('fill:')
    })

    it('shows a readable label on a colored marker', () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), color: '#111827', positions: [makeLocalPosition()] },
      })

      expect(wrapper.find('[data-test="editor-position"] text').attributes('style')).toContain('fill: #F4F4F4')
    })

    it('emits set-color from a position row palette without also selecting the row', async () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()] },
      })

      await wrapper.get('[data-test="position-color-trigger"]').trigger('click')
      await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[0].key}"]`).trigger('click')

      expect(wrapper.emitted('set-color')).toEqual([['pos-1', COLOR_PALETTE[0].hex]])
      expect(wrapper.findAll('[data-test="marker-highlight"]')).toHaveLength(0)

      await wrapper.get('[data-test="position-color-trigger"]').trigger('click')
      await wrapper.get('[data-test="color-palette-clear"]').trigger('click')
      expect(wrapper.emitted('set-color')?.[1]).toEqual(['pos-1', null])
    })

    it("shows the position's own color on its row button", () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition({ color: '#EF4444' })] },
      })

      expect(wrapper.get('[data-test="position-color-indicator"]').attributes('data-color')).toBe('#EF4444')
    })
  })

  describe('custom labels and notes', () => {
    const annotated = () =>
      makeLocalPosition({ customLabel: { en: 'Av', pt_BR: 'Ev' }, note: { en: 'Avoid it', pt_BR: 'Evite' } })

    it("shows each position's custom label and note in the editor's language", () => {
      const inLanguage = (language: string) =>
        mount(FrettedDiagramEditor, { props: { instrument: makeFrettedInstrument(), positions: [annotated()], language } })

      const en = inLanguage('en')
      expect((en.get('[data-test="position-custom-label"]').element as HTMLInputElement).value).toBe('Av')
      expect((en.get('[data-test="position-note"]').element as HTMLInputElement).value).toBe('Avoid it')
      const pt = inLanguage('pt_BR')
      expect((pt.get('[data-test="position-custom-label"]').element as HTMLInputElement).value).toBe('Ev')
      expect((pt.get('[data-test="position-note"]').element as HTMLInputElement).value).toBe('Evite')
    })

    it('emits a typed custom label and note for the position', async () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()], language: 'en' },
      })

      await wrapper.get('[data-test="position-custom-label"]').setValue('Av')
      await wrapper.get('[data-test="position-note"]').setValue('Avoid it')

      expect(wrapper.emitted('set-custom-label')).toEqual([['pos-1', 'Av']])
      expect(wrapper.emitted('set-note')).toEqual([['pos-1', 'Avoid it']])
    })

    it('limits a custom label to two characters and a note to 280', () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()], language: 'en' },
      })

      expect(wrapper.get('[data-test="position-custom-label"]').attributes('maxlength')).toBe('2')
      expect(wrapper.get('[data-test="position-note"]').attributes('maxlength')).toBe('280')
    })

    it("shows a position's custom label on its fretboard marker instead of the interval", () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [annotated(), makeLocalPosition({ id: 'pos-2', fret: 8 })], language: 'pt_BR' },
      })

      expect(wrapper.findAll('[data-test="editor-position"] text').map((t) => t.text())).toEqual(['Ev', 'R'])
    })
  })

  describe('highlighted regions', () => {
    const instrument = makeFrettedInstrument()
    const geometry = frettedEditorGeometry(instrument.string_count ?? 6)
    const rowGap = stringY(2, geometry) - stringY(1, geometry)
    const mountWith = (regions: LocalRegion[], language = 'en') =>
      mount(FrettedDiagramEditor, { props: { instrument, positions: [], regions, language } })

    it("draws a band over a region's fret spaces, limited to its strings", () => {
      const wrapper = mountWith([makeLocalRegion({ fretStart: 5, fretEnd: 8, stringStart: 2, stringEnd: 4 })])

      const band = wrapper.get('[data-test="editor-region"]')
      expect(Number(band.attributes('x'))).toBeCloseTo(fretX(4, geometry))
      expect(Number(band.attributes('width'))).toBeCloseTo(fretX(8, geometry) - fretX(4, geometry))
      expect(Number(band.attributes('y'))).toBeCloseTo(stringY(2, geometry) - rowGap / 2)
      expect(Number(band.attributes('height'))).toBeCloseTo(3 * rowGap)
    })

    it('covers every string when a region has no string limits', () => {
      const wrapper = mountWith([makeLocalRegion()])

      const band = wrapper.get('[data-test="editor-region"]')
      expect(Number(band.attributes('y'))).toBeCloseTo(stringY(1, geometry) - rowGap / 2)
      expect(Number(band.attributes('height'))).toBeCloseTo(6 * rowGap)
    })

    it('starts a region from fret 0 at the open-string area, left of the nut', () => {
      const wrapper = mountWith([makeLocalRegion({ fretStart: 0, fretEnd: 2 })])

      const band = wrapper.get('[data-test="editor-region"]')
      expect(Number(band.attributes('x'))).toBeCloseTo(fretX(0, geometry) - EDITOR_PX_PER_FRET)
    })

    it("tints a band with the region's color, or the accent color when it has none", () => {
      const wrapper = mountWith([makeLocalRegion({ color: '#EF4444' }), makeLocalRegion({ id: 'region-2', fretStart: 10, fretEnd: 12 })])

      const [colored, plain] = wrapper.findAll('[data-test="editor-region"]')
      expect(colored!.attributes('style')).toContain('fill: #EF4444')
      expect(plain!.classes()).toContain('fill-accent')
    })

    it("captions each band in the editor's language", () => {
      const region = makeLocalRegion({ description: { en: 'Box 1', pt_BR: 'Caixa 1' } })

      expect(mountWith([region], 'en').get('[data-test="editor-region-caption"]').text()).toBe('Box 1')
      expect(mountWith([region], 'pt_BR').get('[data-test="editor-region-caption"]').text()).toBe('Caixa 1')
    })

    it("doesn't draw a region that runs backwards or past the last string", () => {
      const wrapper = mountWith([
        makeLocalRegion({ id: 'backwards', fretStart: 8, fretEnd: 5 }),
        makeLocalRegion({ id: 'past-last-string', stringStart: 5, stringEnd: 7 }),
        makeLocalRegion({ id: 'valid' }),
      ])

      expect(wrapper.findAll('[data-test="editor-region"]')).toHaveLength(1)
    })

    it('draws bands behind the strings and markers, so placed positions stay visible', () => {
      const wrapper = mount(FrettedDiagramEditor, {
        props: { instrument, positions: [makeLocalPosition()], regions: [makeLocalRegion()] },
      })

      const html = wrapper.get('svg').html()
      const band = html.indexOf('data-test="editor-region"')
      expect(band).toBeGreaterThanOrEqual(0)
      expect(band).toBeLessThan(html.indexOf('data-test="editor-position"'))
      expect(band).toBeLessThan(html.indexOf('<line '))
    })

    it('makes room above the board for captions only when there are regions', () => {
      const height = (regions: LocalRegion[]) => Number(mountWith(regions).get('svg').attributes('viewBox')!.split(' ')[3])

      expect(height([])).toBe(EDITOR_VIEW_H)
      expect(height([makeLocalRegion()])).toBe(EDITOR_VIEW_H + EDITOR_CAPTION_SPACE)
    })

    it('still places a clicked position on the right cell when the board is shifted down for captions', async () => {
      const wrapper = mountWith([makeLocalRegion()])
      const svg = wrapper.get('svg')
      mockOneToOneBoundingRect(svg.element, editorViewWidth(geometry), EDITOR_VIEW_H + EDITOR_CAPTION_SPACE)

      // 40% of a string gap below string 3: ignoring the caption offset would tip it onto string 4.
      await svg.trigger('click', { clientX: fretX(5, geometry), clientY: stringY(3, geometry) + 0.4 * rowGap + EDITOR_CAPTION_SPACE })

      expect(wrapper.emitted('toggle-cell')).toEqual([[{ string: 3, fret: 5 }]])
    })
  })

  describe('overlays', () => {
    function makeOverlay(overrides: Partial<StackLayer> = {}): StackLayer {
      return {
        names: { en: 'A minor pentatonic' },
        color: null,
        positions: [
          { position_id: 'o1', string: 3, fret: 2, interval: 'R', note_name: 'A', shape: 'dot', sequence_index: 0 },
          { position_id: 'o2', string: 2, fret: 5, interval: 'b3', note_name: 'C', shape: 'square', sequence_index: 1 },
        ],
        regions: [],
        skillIds: [],
        conceptIds: [],
        ...overrides,
      }
    }

    function mountWithOverlays(overlays: StackLayer[], props: Record<string, unknown> = {}) {
      return mount(FrettedDiagramEditor, {
        props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()], overlays, ...props },
      })
    }

    it("draws every overlay's positions on top of the diagram's own, without listing them for editing", () => {
      const wrapper = mountWithOverlays([makeOverlay(), makeOverlay({ positions: [makeOverlay().positions[0]!] })])

      const overlayMarkers = wrapper.findAll('[data-test="editor-overlay-position"]')
      expect(overlayMarkers).toHaveLength(3)
      const markers = wrapper.findAll('[data-test="editor-position"], [data-test="editor-overlay-position"]')
      expect(markers[0]?.attributes('data-test')).toBe('editor-position')
      expect(wrapper.findAll('[data-test="position-controls"]')).toHaveLength(1)
    })

    it("can't be clicked, so a click still reaches the board underneath", () => {
      const wrapper = mountWithOverlays([makeOverlay()])

      for (const marker of wrapper.findAll('[data-test="editor-overlay-position"]')) {
        expect(marker.classes()).toContain('pointer-events-none')
      }
    })

    it("colours an overlay marker with its own colour, then its layer's, never the diagram's general colour", () => {
      const [first, second] = makeOverlay().positions
      const wrapper = mountWithOverlays(
        [
          makeOverlay({ color: '#22C55E', positions: [{ ...first!, color: '#EF4444' }, second!] }),
          makeOverlay({ color: null, positions: [{ ...first!, fret: 9 }] }),
        ],
        { color: '#3B82F6' },
      )

      const shapes = wrapper.findAll('[data-test="editor-overlay-position"]').map((m) => m.find('circle, rect, polygon'))
      expect(shapes[0]?.attributes('style')).toContain('fill: #EF4444')
      expect(shapes[1]?.attributes('style')).toContain('fill: #22C55E')
      expect(shapes[2]?.attributes('style')).toBeUndefined()
      expect(shapes[2]?.classes()).toContain('fill-accent')
    })

    it("labels an overlay marker with its custom label in the editor's language, else its own interval", () => {
      const [first, second] = makeOverlay().positions
      const wrapper = mountWithOverlays(
        [makeOverlay({ positions: [{ ...first!, custom_label: { en: 'Hi', pt_BR: 'Oi' } }, second!] })],
        { language: 'pt_BR' },
      )

      const labels = wrapper.findAll('[data-test="editor-overlay-position"] text').map((t) => t.text())
      expect(labels).toEqual(['Oi', 'b3'])
    })
  })
})
