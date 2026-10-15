import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import DrillOptionGrid from '@/shared/components/DrillOptionGrid.vue'
import type { DrillOption } from '@/shared/components/DrillOptionGrid.vue'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const NUMERALS: DrillOption[] = ['ii', 'IV', 'V', 'vi'].map((numeral) => ({ value: numeral, label: numeral }))
const CHORDS: DrillOption[] = (['C', 'Em', 'Am', 'D'] as const).map((symbol) => ({ value: symbol, label: symbol, chord: drillVoicings[symbol] }))

type Props = { kind: 'text' | 'chord_box' | 'chord_symbol'; options: DrillOption[]; reveal: { right: string } | null; locked: boolean; choice: string | null }

let wrapper: ReturnType<typeof mountGrid> | null = null

function mountGrid(props: Partial<Props> = {}) {
  const mounted = mount(DrillOptionGrid, {
    props: {
      kind: 'text',
      options: NUMERALS,
      instrument: drillGuitar,
      reveal: null,
      locked: false,
      choice: null,
      'onUpdate:choice': (value: string | null) => mounted.setProps({ choice: value }),
      ...props,
    },
    attachTo: document.body,
  })
  wrapper = mounted
  return mounted
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

const options = (grid: ReturnType<typeof mountGrid>) => grid.findAll('button')
const states = (grid: ReturnType<typeof mountGrid>) => options(grid).map((option) => option.attributes('data-state'))

describe('DrillOptionGrid', () => {
  it('offers each option with its key, in the order planned', () => {
    const grid = mountGrid()

    expect(options(grid).map((option) => [option.get('[data-test="key-hint"]').text(), option.get('[data-test="option-label"]').text()])).toEqual([
      ['1', 'ii'],
      ['2', 'IV'],
      ['3', 'V'],
      ['4', 'vi'],
    ])
  })

  it('takes a tap as the answer', async () => {
    const grid = mountGrid()

    await options(grid)[3]!.trigger('click')
    expect(grid.emitted('update:choice')).toEqual([['vi']])
  })

  it('takes a number key as the answer', async () => {
    const grid = mountGrid()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
    expect(grid.emitted('update:choice')).toEqual([['IV']])
  })

  it('once graded, marks the right option and a wrong pick, and locks the rest', () => {
    const grid = mountGrid({ choice: 'IV', reveal: { right: 'vi' } })

    expect(states(grid)).toEqual(['locked', 'wrong', 'locked', 'right'])
  })

  it('takes no answer while locked, by tap or key', async () => {
    const grid = mountGrid({ locked: true })

    await options(grid)[0]!.trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    expect(grid.emitted('update:choice')).toBeUndefined()
    expect(states(grid)).toEqual(['locked', 'locked', 'locked', 'locked'])
  })

  it('draws chord options as boxes, two a row, named by their key only until the answer', () => {
    const grid = mountGrid({ kind: 'chord_box', options: CHORDS })

    expect(grid.get('[data-test="drill-options"]').classes()).toContain('grid-cols-2')
    expect(grid.findAll('svg').map((box) => box.attributes('aria-label'))).toEqual(['Chord 1', 'Chord 2', 'Chord 3', 'Chord 4'])
    for (const symbol of ['C', 'Em', 'Am', 'D']) expect(grid.text().split(/\s+/)).not.toContain(symbol)
  })

  it('names the chord boxes once the answer is in', () => {
    const grid = mountGrid({ kind: 'chord_box', options: CHORDS, choice: 'C', reveal: { right: 'Em' } })

    expect(grid.findAll('[data-test="option-label"]').map((label) => label.text())).toEqual(['C', 'Em', 'Am', 'D'])
    expect(states(grid)).toEqual(['wrong', 'right', 'locked', 'locked'])
  })

  it('writes chord options as symbols on bass', () => {
    const grid = mountGrid({ kind: 'chord_symbol', options: CHORDS.map(({ value, label }) => ({ value, label })) })

    expect(grid.findAll('svg')).toHaveLength(0)
    expect(options(grid).map((option) => option.find('[data-test="option-label"]').text())).toEqual(['C', 'Em', 'Am', 'D'])
  })
})
