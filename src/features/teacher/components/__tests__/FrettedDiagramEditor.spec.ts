import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import { i18n } from '@/i18n'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'
import { EDITOR_VIEW_H, editorViewWidth, fretX, frettedEditorGeometry, stringY } from '@/shared/utils/frettedFretboardEditor'
import type { LocalPosition } from '@/features/teacher/composables/useDiagramForm'

/** Makes clientX/clientY map 1:1 onto the SVG's own viewBox coordinates, since jsdom otherwise reports a zero-size bounding rect. */
function mockOneToOneBoundingRect(el: Element, width: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width,
    height: EDITOR_VIEW_H,
    left: 0,
    top: 0,
    right: width,
    bottom: EDITOR_VIEW_H,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

function makeLocalPosition(overrides: Partial<LocalPosition> = {}): LocalPosition {
  return { id: 'pos-1', string: 6, fret: 5, interval: 'R', noteName: 'A', shape: 'dot', color: null, sequenceIndex: null, customLabel: {}, note: {}, ...overrides }
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
})
