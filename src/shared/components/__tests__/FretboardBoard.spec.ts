import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import FretboardBoard from '@/shared/components/diagram/FretboardBoard.vue'
import { fretLineX, markerCenterX, stringLineY } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'

const OPEN_FRAME: BoardFrame = { minFret: 0, maxFret: 5, stringCount: 6, left: 26, columnGap: 88, rowGap: 44, top: 40 }
const UPPER_FRAME: BoardFrame = { ...OPEN_FRAME, minFret: 9, maxFret: 13, left: 4, columnGap: 60 }
const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

/** Draws the board inside an <svg>, as its parent renderers do, with `fills` slot content. */
function mountBoard(props: { frame: BoardFrame; tuning?: string[] }, fills?: () => unknown) {
  return mount(
    defineComponent({
      render: () => h('svg', [h(FretboardBoard, props, fills ? { fills } : undefined)]),
    }),
  )
}

describe('FretboardBoard', () => {
  it('lays the board from the lowest to the highest fret wire, half a string gap beyond the outer strings', () => {
    const wood = mountBoard({ frame: UPPER_FRAME }).get('[data-test="fretboard-area"]')

    expect(Number(wood.attributes('x'))).toBe(fretLineX(UPPER_FRAME, 9))
    expect(Number(wood.attributes('width'))).toBe(fretLineX(UPPER_FRAME, 13) - fretLineX(UPPER_FRAME, 9))
    expect(Number(wood.attributes('y'))).toBe(stringLineY(UPPER_FRAME, 1) - 22)
    expect(Number(wood.attributes('height'))).toBe(5 * 44 + 44)
  })

  it('draws a nut only when the board starts at fret 0', () => {
    expect(mountBoard({ frame: OPEN_FRAME }).find('[data-test="diagram-nut"]').exists()).toBe(true)
    expect(mountBoard({ frame: UPPER_FRAME }).find('[data-test="diagram-nut"]').exists()).toBe(false)
  })

  it('draws a fret line for every fret of the window, the nut standing in for fret 0', () => {
    const wires = (frame: BoardFrame) =>
      mountBoard({ frame }).findAll('[data-test="fret-wire"]').map((wire) => Number(wire.attributes('data-fret')))

    expect(wires(OPEN_FRAME)).toEqual([1, 2, 3, 4, 5])
    expect(wires(UPPER_FRAME)).toEqual([9, 10, 11, 12, 13])
  })

  it('draws inlays only in the fret spaces the board shows: single ones, and a double at 12', () => {
    const inlays = mountBoard({ frame: UPPER_FRAME }).findAll('[data-test="fret-inlay"]')

    expect(inlays.map((inlay) => Number(inlay.attributes('data-fret')))).toEqual([12, 12])
    expect(Number(inlays[0]!.attributes('cx'))).toBe(markerCenterX(UPPER_FRAME, 12))
  })

  it('draws strings thicker as their open pitch gets lower', () => {
    const widths = mountBoard({ frame: OPEN_FRAME, tuning: STANDARD_TUNING })
      .findAll('[data-test="diagram-string"]')
      .map((string) => Number(string.attributes('stroke-width')))

    expect(widths).toHaveLength(6)
    expect(widths[5]!).toBeGreaterThan(widths[0]!)
  })

  it('draws every string alike on an instrument without a tuning', () => {
    const widths = mountBoard({ frame: OPEN_FRAME })
      .findAll('[data-test="diagram-string"]')
      .map((string) => string.attributes('stroke-width'))

    expect(new Set(widths).size).toBe(1)
  })

  it('numbers each shown fret space under its middle, and the nut 0', () => {
    const numbers = mountBoard({ frame: OPEN_FRAME }).findAll('[data-test="fret-number"]')

    expect(numbers.map((number) => number.text())).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(Number(numbers[0]!.attributes('x'))).toBe(fretLineX(OPEN_FRAME, 0))
    expect(Number(numbers[3]!.attributes('x'))).toBe(markerCenterX(OPEN_FRAME, 3))
  })

  it('draws a flat board in the theme’s colours, with no wood, grain or metal', () => {
    const wrapper = mountBoard({ frame: OPEN_FRAME, tuning: STANDARD_TUNING })

    expect(wrapper.find('defs').exists()).toBe(false)
    expect(wrapper.find('[data-test="board-grain"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="fretboard-area"]').classes()).toContain('fill-surface-raised')
    expect(wrapper.get('[data-test="diagram-nut"]').classes()).toContain('fill-ink')
    expect(wrapper.findAll('[data-test="fret-wire"]').every((wire) => wire.classes().includes('fill-border'))).toBe(true)
    expect(wrapper.findAll('[data-test="diagram-string"]').every((string) => string.classes().includes('stroke-ink-subtle'))).toBe(true)
    expect(wrapper.findAll('[data-test="fret-inlay"]').every((inlay) => inlay.classes().includes('fill-border'))).toBe(true)
    expect(wrapper.findAll('[data-test="fret-number"]').every((number) => number.classes().includes('fill-ink-subtle'))).toBe(true)
  })

  it('draws the nut twice as thick as a fret line', () => {
    const wrapper = mountBoard({ frame: OPEN_FRAME })

    const fret = Number(wrapper.get('[data-test="fret-wire"]').attributes('width'))
    expect(Number(wrapper.get('[data-test="diagram-nut"]').attributes('width'))).toBe(fret * 2)
  })

  it('draws its fills over the board but under the nut, fret lines and strings', () => {
    const svg = mountBoard({ frame: OPEN_FRAME }, () => h('rect', { 'data-test': 'fill' })).get('svg').element
    const order = [...svg.querySelectorAll('[data-test]')].map((element) => element.getAttribute('data-test'))

    expect(order.indexOf('fill')).toBeGreaterThan(order.indexOf('fretboard-area'))
    expect(order.indexOf('fill')).toBeLessThan(order.indexOf('diagram-nut'))
    expect(order.indexOf('fill')).toBeLessThan(order.indexOf('fret-wire'))
    expect(order.indexOf('fill')).toBeLessThan(order.indexOf('diagram-string'))
  })
})
