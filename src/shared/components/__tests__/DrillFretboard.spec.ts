import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function places(wrapper: ReturnType<typeof mount>, selector: string) {
  return wrapper.findAll(selector).map((element) => `${element.attributes('data-string')}:${element.attributes('data-fret')}`)
}

describe('DrillFretboard', () => {
  it('draws the board for the tuning, from the nut to the last fret', () => {
    const wrapper = mount(DrillFretboard, { props: { tuning: STANDARD, maxFret: 11, label: 'Fretboard' } })

    expect(wrapper.get('svg').attributes('aria-label')).toBe('Fretboard')
    expect(wrapper.findAll('[data-test="diagram-string"]')).toHaveLength(6)
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
})
