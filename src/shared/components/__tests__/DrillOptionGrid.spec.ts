import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import DrillOptionGrid from '@/shared/components/DrillOptionGrid.vue'
import type { DrillOption } from '@/shared/components/DrillOptionGrid.vue'
import type { DrillOptionKind } from '@/shared/utils/drillLayout'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const NUMERALS: DrillOption[] = ['ii', 'IV', 'V', 'vi'].map((numeral) => ({ value: numeral, label: numeral }))
const chartOf = (...symbols: (keyof typeof drillVoicings)[]) => symbols.map((symbol) => ({ kind: 'box' as const, ...drillVoicings[symbol] }))
const BOX_CHARTS: DrillOption[] = [
  { value: 'G Em C D', label: 'G Em C D', chart: chartOf('G', 'Em', 'C', 'D') },
  { value: 'G D Em C', label: 'G D Em C', chart: chartOf('G', 'D', 'Em', 'C') },
]
const BLUES = ['G7', 'G7', 'G7', 'G7', 'C7', 'C7', 'G7', 'G7', 'D7', 'C7', 'G7', 'D7']
const SYMBOL_CHARTS: DrillOption[] = [
  { value: BLUES.join(' '), label: BLUES.join(' '), chart: BLUES.map((symbol) => ({ kind: 'symbol' as const, symbol })) },
  { value: 'quick', label: 'quick', chart: ['G7', 'C7', ...BLUES.slice(2)].map((symbol) => ({ kind: 'symbol' as const, symbol })) },
]
const CHORDS: DrillOption[] = (['C', 'Em', 'Am', 'D'] as const).map((symbol) => ({ value: symbol, label: symbol, chord: drillVoicings[symbol] }))

type Props = { kind: DrillOptionKind; options: DrillOption[]; reveal: { right: string } | null; locked: boolean; choice: string | null }

const DEFAULTS: Props = { kind: 'text', options: NUMERALS, reveal: null, locked: false, choice: null }

let wrapper: ReturnType<typeof mountGrid> | null = null

function mountGrid(props: Partial<Props> = {}) {
  const mounted = mount(DrillOptionGrid, {
    props: {
      ...DEFAULTS,
      ...props,
      instrument: drillGuitar,
      'onUpdate:choice': (value: string | null) => mounted.setProps({ choice: value }),
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

  describe('charts as options', () => {
    it('draws each option as its chart of unnamed boxes, with its key', () => {
      const grid = mountGrid({ kind: 'chart_boxes', options: BOX_CHARTS })

      expect(options(grid)).toHaveLength(2)
      expect(options(grid).map((option) => option.findAll('li').length)).toEqual([4, 4])
      expect(options(grid).map((option) => option.get('[data-test="key-hint"]').text())).toEqual(['1', '2'])
      expect(grid.text()).not.toContain('Em')
    })

    it('writes a 12-bar chart as chord symbols, every bar', () => {
      const grid = mountGrid({ kind: 'chart_symbols', options: SYMBOL_CHARTS })

      expect(options(grid).map((option) => option.findAll('li').length)).toEqual([12, 12])
      expect(options(grid)[1]!.findAll('li')[1]!.text()).toBe('C7')
    })

    it('takes a tap on a chart as the answer, its chart sent back as the value', async () => {
      const grid = mountGrid({ kind: 'chart_boxes', options: BOX_CHARTS })

      await options(grid)[1]!.trigger('click')
      expect(grid.emitted('update:choice')).toEqual([['G D Em C']])
    })
  })
})
