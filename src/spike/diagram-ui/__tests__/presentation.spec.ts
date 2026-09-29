import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import DiagramStudy from '../DiagramStudy.vue'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { readableBoardGeometry } from '../geometry'

const props = () => ({ diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef(), presentation: 'study' as const })

describe('readable board geometry', () => {
  it('uses one fret width while keeping nut and first-fret targets separate', () => {
    const g = readableBoardGeometry(326, 3, 6, true)
    expect(g.columnGap * 3 + g.left + g.right).toBe(g.width)
    expect(g.columnGap / 2).toBeGreaterThanOrEqual(44)
  })
  it('keeps adjacent targets separate on a narrow screen', () => {
    const g = readableBoardGeometry(328, 5, 6)
    expect(g.width).toBe(328)
    expect(g.columnGap).toBeGreaterThanOrEqual(48)
    expect(g.rowGap).toBeGreaterThanOrEqual(44)
  })
  it('preserves width for a wide range rather than shrinking labels', () => {
    expect(readableBoardGeometry(328, 16, 6).width).toBeGreaterThan(328)
  })
})

describe('study presentation', () => {
  it('reserves board space for playback controls even without regions', () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), controlsWidth: 112 }, slots: { controls: '<button>Play</button>' } })
    expect(wrapper.get('[data-test="diagram-controls"]').text()).toBe('Play')
    expect(Number(wrapper.get('[data-test="fretboard-wood"]').attributes('y'))).toBeGreaterThanOrEqual(44)
    wrapper.unmount()
  })
  it('moves crowded region controls to a separate rail without stacking their icons', () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), controlsWidth: 112, diagram: makeFrettedDiagram({ regions: [{ region_id: 'early', fret_start: 5, fret_end: 5, description: { en: 'First fret' } }] }) }, slots: { controls: '<button>Play</button>' } })
    expect(Number.parseFloat((wrapper.get('[data-test="region-info"]').element as HTMLElement).style.top)).toBe(44)
    wrapper.unmount()
  })
  it('previews circles, squares and stars through the shape control', async () => {
    const wrapper = mount(DiagramStudy)
    const control = wrapper.find('[data-test="shape-preview"]')
    expect(control.exists()).toBe(true)
    await control.setValue('mixed')
    const shapes = wrapper.findAll('[data-test="diagram-position"]').map(shape => shape.element.tagName.toLowerCase())
    expect(new Set(shapes)).toEqual(new Set(['circle', 'rect', 'polygon']))
    await control.setValue('star')
    expect(wrapper.findAll('[data-test="diagram-position"]').every(shape => shape.element.tagName.toLowerCase() === 'polygon')).toBe(true)
    wrapper.unmount()
  })
  it('keeps overlapping area fills, parallel outlines and same-row colored controls', () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), diagram: makeFrettedDiagram({ regions: ['#36b8aa', '#cc88ee', '#e6b85c'].map((color, index) => ({ region_id: `box-${index}`, fret_start: 5, fret_end: 8, string_start: 1, string_end: 6, color, description: { en: `Area ${index}` } })) }) } })
    const cues = wrapper.findAll('[data-test="region-info"]')
    const style = (index: number) => (cues[index]!.element as HTMLElement).style
    expect(new Set(cues.map((_, i) => style(i).top)).size).toBe(1)
    const lefts = cues.map((_, i) => Number.parseFloat(style(i).left)).sort((a,b) => a-b)
    expect(lefts[1]! - lefts[0]!).toBeGreaterThanOrEqual(44)
    expect(lefts[2]! - lefts[1]!).toBeGreaterThanOrEqual(44)
    expect(new Set(cues.map((_, i) => style(i).color)).size).toBe(3)
    const fills = wrapper.findAll('[data-test="diagram-region"]')
    expect(fills).toHaveLength(3)
    expect(fills.every(fill => Number(fill.attributes('fill-opacity')) > 0)).toBe(true)
    const borders = wrapper.findAll('[data-test="region-outline"]')
    expect(borders).toHaveLength(3)
    expect(new Set(borders.map(border => border.attributes('y'))).size).toBe(3)
    expect(borders.map(border => border.attributes('stroke'))).toEqual(['#36b8aa', '#cc88ee', '#e6b85c'])
  })
  it('dismisses on outside pointer input, preserves inside input, and still selects notes', async () => {
    const wrapper = mount(FrettedDiagramView, { attachTo: document.body, props: { ...props(), selectablePositionIds: ['p0'], diagram: makeFrettedDiagram({ regions: [{ region_id: 'box', fret_start: 5, fret_end: 8, string_start: 1, string_end: 6, color: '#36b8aa', description: { en: 'First position' } }] }) } })
    try {
      const cue = wrapper.find('[data-test="region-info"]')
      await cue.trigger('click')
      await wrapper.find('[data-test="region-description"]').trigger('pointerdown')
      expect(wrapper.find('[data-test="region-description"]').exists()).toBe(true)
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()
      expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
      await cue.trigger('click')
      const note = wrapper.find('[role="radio"]')
      await note.trigger('pointerdown')
      await note.trigger('click')
      expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
      expect(wrapper.emitted('select')).toEqual([['p0']])
    } finally { wrapper.unmount() }
  })
  it('anchors the small icon within the scrollable region geometry', () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), diagram: makeFrettedDiagram({ regions: [{ region_id: 'box', fret_start: 5, fret_end: 6, string_start: 1, string_end: 6, color: '#36b8aa', description: { en: 'First position' } }] }) } })
    const cue = wrapper.find('[data-test="region-info"]')
    const area = wrapper.find('[data-test="diagram-region"]')
    expect(cue.element.closest('[data-test="board-scroll"]')).not.toBeNull()
    expect(Number(cue.find('svg').attributes('width'))).toBe(16)
    const left = Number.parseFloat(cue.element.getAttribute('style')!.match(/left: ([\d.]+)px/)![1]!)
    expect(left + 22).toBeLessThanOrEqual(Number(area.attributes('x')) + Number(area.attributes('width')))
  })
  it('offers a visible touch button for each region without showing its description', async () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), diagram: makeFrettedDiagram({ regions: [{ region_id: 'box', fret_start: 5, fret_end: 8, string_start: 1, string_end: 6, color: '#36b8aa', description: { en: 'First position' } }] }) } })
    const cue = wrapper.find('[data-test="region-info"]')
    expect(cue.exists()).toBe(true)
    expect(cue.attributes('aria-expanded')).toBe('false')
    expect(cue.text()).not.toContain('First position')
    expect(cue.find('svg').exists()).toBe(true)
    await cue.trigger('click')
    expect(wrapper.find('[data-test="region-description"]').text()).toContain('First position')
    expect(wrapper.emitted('select')).toBeUndefined()
    await cue.trigger('click')
    expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
  })
  it('shows a region description only after activating its colored area', async () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), diagram: makeFrettedDiagram({ regions: [{ region_id: 'box', fret_start: 5, fret_end: 8, string_start: 1, string_end: 6, color: '#36b8aa', description: { en: 'First position' } }] }) } })
    expect(wrapper.find('[data-test="study-caption"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
    const area = wrapper.find('[data-test="diagram-region"]')
    expect(wrapper.find('[data-test="region-outline"]').attributes('stroke')).toBe('#36b8aa')
    await area.trigger('click')
    expect(wrapper.find('[data-test="region-description"]').text()).toContain('First position')
    expect(wrapper.find('[data-test="region-description"]').attributes('style')).toContain('rgb(54, 184, 170)')
    await area.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-test="region-description"]').exists()).toBe(false)
  })
  it('keeps open-string targets fully inside the viewport and fills the right edge', () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), diagram: makeFrettedDiagram({ positions: [{ position_id: 'open', string: 1, fret: 0, interval: 'R', note_name: 'E', shape: 'dot' }, { position_id: 'third', string: 1, fret: 3, interval: 'b3', note_name: 'G', shape: 'dot' }] }), selectablePositionIds: ['open', 'third'] } })
    const targets = wrapper.findAll('[data-test="diagram-choice-target"]')
    expect(Number(targets[0]!.attributes('cx')) - Number(targets[0]!.attributes('r'))).toBeGreaterThanOrEqual(2)
    const board = wrapper.find('[data-test="fretboard-wood"]')
    const width = Number(wrapper.find('[data-test="diagram-canvas"]').attributes('width'))
    expect(width - Number(board.attributes('x')) - Number(board.attributes('width'))).toBeLessThanOrEqual(4)
    expect(wrapper.findAll('[data-test="fret-number"]').map(el => el.text())).toEqual(['0', '1', '2', '3'])
  })
  it('draws a nut only when fret zero is visible', async () => {
    const wrapper = mount(FrettedDiagramView, { props: props() })
    expect(wrapper.find('[data-test="diagram-nut"]').exists()).toBe(false)
    await wrapper.setProps({ diagram: makeFrettedDiagram({ positions: [{ position_id: 'open', string: 1, fret: 0, interval: 'R', note_name: 'E', shape: 'dot' }] }) })
    expect(wrapper.find('[data-test="diagram-nut"]').exists()).toBe(true)
  })
  it('never highlights a hidden sounding position and preserves selection identity', async () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), diagramRef: makeDiagramRef({ layers: { intervals: true, hidden_position_ids: ['p0'] } }), activePositionIds: ['p0', 'p1'], selectablePositionIds: ['p1'] } })
    const highlights = wrapper.findAll('[data-test="diagram-playing"]')
    expect(highlights).toHaveLength(1)
    expect(highlights[0]!.attributes('data-position-id')).toBe('p1')
    await wrapper.find('[role="radio"]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toEqual([['p1']])
  })
  it('uses unique paint definitions for repeated instances of the same diagram', () => {
    const a = mount(FrettedDiagramView, { props: props() })
    const b = mount(FrettedDiagramView, { props: props() })
    // Separate apps can restart useId; test repeated instances within one app.
    a.unmount(); b.unmount()
    const pair = mount({ components: { FrettedDiagramView }, setup: () => ({ p: props() }), template: '<div><FrettedDiagramView v-bind="p"/><FrettedDiagramView v-bind="p"/></div>' })
    const ids = pair.findAll('defs [id]').map(el => el.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('renders readable labels and retains the board without texture', () => {
    const wrapper = mount(FrettedDiagramView, { props: { ...props(), texture: false } })
    expect(Number(wrapper.find('[data-test="fret-number"]').attributes('font-size'))).toBeGreaterThanOrEqual(14)
    expect(wrapper.find('[data-test="fretboard-wood"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="board-grain"]').exists()).toBe(false)
  })
})
