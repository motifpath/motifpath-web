import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { nextTick } from 'vue'

import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function places(wrapper: ReturnType<typeof mount>, selector: string) {
  return wrapper.findAll(selector).map((element) => `${element.attributes('data-string')}:${element.attributes('data-fret')}`)
}

describe('DrillFretboard', () => {
  it('rings the places toggled on, and says which tap targets are pressed when taps toggle', () => {
    const wrapper = mount(DrillFretboard, {
      props: { tuning: STANDARD, maxFret: 12, label: 'Fretboard', fretWindow: { from: 3, to: 7 }, tapStrings: [1, 6], selectable: true, selected: [{ string: 6, fret: 3 }] },
    })

    expect(places(wrapper, '[data-test="selected-cell"]')).toEqual(['6:3'])
    expect(wrapper.get('[data-test="drill-cell"][data-string="6"][data-fret="3"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="drill-cell"][data-string="1"][data-fret="3"]').attributes('aria-pressed')).toBe('false')
  })

  it('says nothing about pressed taps when a tap answers at once', () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 12, label: 'Fretboard', tapStrings: [6] } })

    expect(wrapper.get('[data-test="drill-cell"]').attributes('aria-pressed')).toBeUndefined()
  })

  it('draws the board for the tuning, from the nut to the last fret', () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 11, label: 'Fretboard' } })

    expect(wrapper.get('svg').attributes('aria-label')).toBe('Fretboard')
    expect(wrapper.findAll('[data-test="diagram-string"]')).toHaveLength(6)
  })

  it('marks the places to play, a root as R in the darker colour, each named by what it is and where', () => {
    const bass = ['E1', 'A1', 'D2', 'G2']
    const wrapper = mount(DrillFretboard, {
      props: {
        tuning: bass,
        maxFret: 5,
        label: 'Bass',
        places: [
          { string: 4, fret: 3, role: 'root' },
          { string: 3, fret: 5, role: 'fifth' },
        ],
      },
    })

    const marked = wrapper.findAll('[data-test="marked-place"]')
    expect(marked.map((place) => [place.attributes('data-string'), place.attributes('data-fret'), place.attributes('data-role')])).toEqual([
      ['4', '3', 'root'],
      ['3', '5', 'fifth'],
    ])
    expect(marked.map((place) => place.attributes('aria-label'))).toEqual(['Root, string 4, fret 3', 'Fifth, string 3, fret 5'])
    expect(marked[0]!.text()).toBe('R')
    expect(marked[0]!.get('circle').classes()).toContain('fill-ink')
    expect(marked[1]!.get('circle').classes()).toContain('fill-accent')
  })

  it('marks a third as 3, named as the third of its chord, so a line shows the chord is major or minor', () => {
    const wrapper = mount(DrillFretboard, {
      props: {
        tuning: ['E1', 'A1', 'D2', 'G2'],
        maxFret: 5,
        label: 'Bass',
        places: [
          { string: 4, fret: 0, role: 'root', chord: 'Em' },
          { string: 1, fret: 0, role: 'third', chord: 'Em' },
          { string: 3, fret: 2, role: 'fifth', chord: 'Em' },
        ],
      },
    })

    const marked = wrapper.findAll('[data-test="marked-place"]')
    expect(marked.map((place) => place.attributes('data-role'))).toEqual(['root', 'third', 'fifth'])
    expect(marked.map((place) => place.text())).toEqual(['R', '3', ''])
    expect(marked[1]!.attributes('aria-label')).toBe('Third of Em, string 1, open')
    expect(marked[1]!.get('circle').classes()).toContain('fill-accent')
  })

  it('names an open place as open', () => {
    const wrapper = mount(DrillFretboard, {
      props: { tuning: ['E1', 'A1', 'D2', 'G2'], maxFret: 5, label: 'Bass', places: [{ string: 3, fret: 0, role: 'root' }] },
    })

    expect(wrapper.get('[data-test="marked-place"]').attributes('aria-label')).toBe('Root, string 3, open')
  })

  it('names a marked root by its chord, when the board marks more than one chord', () => {
    const wrapper = mount(DrillFretboard, {
      props: {
        tuning: ['E1', 'A1', 'D2', 'G2'],
        maxFret: 5,
        label: 'Bass',
        places: [
          { string: 3, fret: 0, role: 'root', chord: 'Am' },
          { string: 3, fret: 3, role: 'root', chord: 'C' },
        ],
      },
    })

    expect(wrapper.findAll('[data-test="marked-place"]').map((place) => place.attributes('aria-label'))).toEqual([
      'Root of Am, string 3, open',
      'Root of C, string 3, fret 3',
    ])
  })

  it('takes taps only on the strings asked, at every fret from the open string', async () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 3, tapStrings: [6], label: 'Fretboard' } })

    expect(places(wrapper, '[data-test="drill-cell"]')).toEqual(['6:0', '6:1', '6:2', '6:3'])

    await wrapper.findAll('[data-test="drill-cell"]')[2]!.trigger('click')
    expect(wrapper.emitted('tap')).toEqual([[{ string: 6, fret: 2 }]])
  })

  it('names each cell by where it is, never by its note', () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 1, tapStrings: [5], label: 'Fretboard' } })

    expect(wrapper.findAll('[data-test="drill-cell"]').map((cell) => cell.attributes('aria-label'))).toEqual(['String 5, open', 'String 5, fret 1'])
  })

  it('takes a tap from the keyboard too', async () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 3, tapStrings: [1], label: 'Fretboard' } })

    await wrapper.findAll('[data-test="drill-cell"]')[1]!.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('tap')).toEqual([[{ string: 1, fret: 1 }]])
  })

  it('takes no tap once it is locked', async () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 3, tapStrings: [6], locked: true, label: 'Fretboard' } })

    await wrapper.findAll('[data-test="drill-cell"]')[1]!.trigger('click')
    expect(wrapper.emitted('tap')).toBeUndefined()
  })

  it('lights the cell shown', () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 11, lit: { string: 5, fret: 3 }, label: 'Fretboard' } })

    expect(places(wrapper, '[data-test="lit-cell"]')).toEqual(['5:3'])
  })

  it('marks the string asked about', () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 11, askedString: 6, label: 'Fretboard' } })

    expect(wrapper.get('[data-test="asked-string"]').attributes('data-string')).toBe('6')
  })

  it('marks graded cells right or wrong', () => {
    const wrapper = mount(DrillFretboard, {
      props: {
        tuning: STANDARD,
        maxFret: 11,
        marks: [
          { string: 6, fret: 2, mark: 'wrong' as const },
          { string: 6, fret: 1, mark: 'right' as const },
        ],
        label: 'Fretboard',
      },
    })

    expect(wrapper.findAll('[data-test="diagram-mark"]').map((mark) => mark.attributes('data-mark'))).toEqual(['wrong', 'right'])
    expect(places(wrapper, '[data-test="cell-mark"]')).toEqual(['6:2', '6:1'])
  })

  // Too narrow for the whole neck at a tappable size, the board shows only the drill's window.
  describe('in a fret window, too narrow for the whole neck', () => {
    const numbers = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[data-test="fret-number"]').map((n) => n.text())
    const widths = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[data-test="drill-cell"]').map((cell) => Number(cell.attributes('width')))

    it('draws only the window and takes taps only in it', () => {
      const wrapper = mount(DrillFretboard, {
        props: { tuning: STANDARD, maxFret: 12, fretWindow: { from: 3, to: 7 }, tapStrings: [6], label: 'Fretboard' },
      })

      expect(numbers(wrapper)).toEqual(['3', '4', '5', '6', '7'])
      expect(places(wrapper, '[data-test="drill-cell"]')).toEqual(['6:3', '6:4', '6:5', '6:6', '6:7'])
      expect(wrapper.find('[data-test="diagram-nut"]').exists()).toBe(false)
      expect(Math.min(...widths(wrapper))).toBeGreaterThanOrEqual(48)
    })

    it('at the nut, makes the open-string place left of the nut as wide as a fret', () => {
      const wrapper = mount(DrillFretboard, {
        props: { tuning: STANDARD, maxFret: 12, fretWindow: { from: 0, to: 5 }, tapStrings: [6], label: 'Fretboard' },
      })

      expect(numbers(wrapper)).toEqual(['0', '1', '2', '3', '4', '5'])
      expect(places(wrapper, '[data-test="drill-cell"]')).toEqual(['6:0', '6:1', '6:2', '6:3', '6:4', '6:5'])
      const nut = wrapper.get('[data-test="diagram-nut"]')
      const nutX = Number(nut.attributes('x')) + Number(nut.attributes('width')) / 2
      const open = wrapper.findAll('[data-test="drill-cell"]')[0]!
      expect(Number(open.attributes('x')) + Number(open.attributes('width'))).toBeLessThanOrEqual(nutX)
      expect(Math.min(...widths(wrapper))).toBeGreaterThanOrEqual(48)
    })

    it('answers a tap on the open-string place as the open string', async () => {
      const wrapper = mount(DrillFretboard, {
        props: { tuning: STANDARD, maxFret: 12, fretWindow: { from: 0, to: 5 }, tapStrings: [6], label: 'Fretboard' },
      })

      await wrapper.findAll('[data-test="drill-cell"]')[0]!.trigger('click')
      expect(wrapper.emitted('tap')).toEqual([[{ string: 6, fret: 0 }]])
    })

    it('lights a cell inside the window', () => {
      const wrapper = mount(DrillFretboard, {
        props: { tuning: STANDARD, maxFret: 12, fretWindow: { from: 7, to: 11 }, lit: { string: 4, fret: 9 }, label: 'Fretboard' },
      })

      expect(numbers(wrapper)).toEqual(['7', '8', '9', '10', '11'])
      expect(places(wrapper, '[data-test="lit-cell"]')).toEqual(['4:9'])
    })
  })

  describe('in a fret window, wide enough for the whole neck', () => {
    let widthSpy: MockInstance
    beforeEach(() => {
      widthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1024)
    })
    afterEach(() => widthSpy.mockRestore())

    it('draws the whole neck, dims the frets outside the window and takes taps only in it', async () => {
      const wrapper = mount(DrillFretboard, {
        props: { tuning: STANDARD, maxFret: 12, fretWindow: { from: 6, to: 10 }, tapStrings: [6], label: 'Fretboard' },
      })
      await nextTick()

      expect(wrapper.findAll('[data-test="fret-number"]')).toHaveLength(13)
      expect(places(wrapper, '[data-test="drill-cell"]')).toEqual(['6:6', '6:7', '6:8', '6:9', '6:10'])
      expect(wrapper.findAll('[data-test="outside-window"]').map((zone) => zone.attributes('data-frets'))).toEqual(['0-5', '11-12'])
    })
  })
})
