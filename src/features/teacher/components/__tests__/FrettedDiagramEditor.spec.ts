import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { EDITOR_VIEW_H, EDITOR_VIEW_W, fretX, frettedEditorGeometry, stringY } from '@/shared/utils/frettedFretboardEditor'
import type { LocalPosition } from '@/features/teacher/composables/useDiagramForm'

/** Makes clientX/clientY map 1:1 onto the SVG's own viewBox coordinates, since jsdom otherwise reports a zero-size bounding rect. */
function mockOneToOneBoundingRect(el: Element) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width: EDITOR_VIEW_W,
    height: EDITOR_VIEW_H,
    left: 0,
    top: 0,
    right: EDITOR_VIEW_W,
    bottom: EDITOR_VIEW_H,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

function makeLocalPosition(overrides: Partial<LocalPosition> = {}): LocalPosition {
  return { id: 'pos-1', string: 6, fret: 5, interval: 'R', noteName: 'A', sequenceIndex: null, ...overrides }
}

describe('FrettedDiagramEditor', () => {
  it('renders one marker per position', () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition(), makeLocalPosition({ id: 'pos-2', fret: 8 })] },
    })

    expect(wrapper.findAll('[data-test="editor-position"]')).toHaveLength(2)
  })

  it('emits toggle-cell with the nearest string/fret when the fretboard is clicked', async () => {
    const instrument = makeFrettedInstrument()
    const wrapper = mount(FrettedDiagramEditor, { props: { instrument, positions: [] } })
    const geometry = frettedEditorGeometry(instrument.string_count ?? 6)

    const svg = wrapper.get('svg')
    mockOneToOneBoundingRect(svg.element)
    await svg.trigger('click', { clientX: fretX(5, geometry), clientY: stringY(3, geometry) })

    expect(wrapper.emitted('toggle-cell')).toEqual([[{ string: 3, fret: 5 }]])
  })

  it('does not emit toggle-cell for a click outside the fretboard bounds', async () => {
    const instrument = makeFrettedInstrument()
    const wrapper = mount(FrettedDiagramEditor, { props: { instrument, positions: [] } })
    const svg = wrapper.get('svg')
    mockOneToOneBoundingRect(svg.element)

    await svg.trigger('click', { clientX: -500, clientY: -500 })

    expect(wrapper.emitted('toggle-cell')).toBeUndefined()
  })

  it('emits edit-interval and edit-note-name when a position control is edited', async () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()] },
    })

    await wrapper.get('[data-test="position-interval-input"]').setValue('b3')
    await wrapper.get('[data-test="position-note-name-input"]').setValue('C')

    expect(wrapper.emitted('edit-interval')).toEqual([['pos-1', 'b3']])
    expect(wrapper.emitted('edit-note-name')).toEqual([['pos-1', 'C']])
  })

  it('emits set-sequence-index as a number when the sequence field is set, and null when cleared', async () => {
    const wrapper = mount(FrettedDiagramEditor, {
      props: { instrument: makeFrettedInstrument(), positions: [makeLocalPosition()] },
    })

    await wrapper.get('[data-test="position-sequence-input"]').setValue('2')
    expect(wrapper.emitted('set-sequence-index')).toEqual([['pos-1', 2]])

    await wrapper.get('[data-test="position-sequence-input"]').setValue('')
    expect(wrapper.emitted('set-sequence-index')).toEqual([['pos-1', 2], ['pos-1', null]])
  })
})
