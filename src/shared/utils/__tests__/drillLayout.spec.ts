import { describe, expect, it } from 'vitest'

import { drillLayoutOf } from '@/shared/utils/drillLayout'

describe('drillLayoutOf', () => {
  it.each([
    ['numeral_to_chord', 'none', 'chord_box'],
    ['function_to_chord', 'none', 'chord_box'],
    ['chord_to_numeral', 'chord_box', 'text'],
    ['chord_to_function', 'chord_box', 'text'],
    ['chart_to_numbers', 'chart_boxes', 'text'],
    ['cadence_then_chord', 'player', 'text'],
    ['progression_by_number', 'player', 'text'],
  ] as const)('on guitar, asks %s over %s with %s options', (way, stimulus, options) => {
    expect(drillLayoutOf(way, 'guitar')).toEqual({ answer: 'choice', stimulus, options })
  })

  it.each([
    ['function_to_chord', 'none', 'chord_symbol'],
    ['chord_to_numeral', 'chord_symbol', 'text'],
    ['chord_to_function', 'chord_symbol', 'text'],
    ['chart_to_numbers', 'chart_symbols', 'text'],
    ['cadence_then_chord', 'player', 'text'],
    ['progression_by_number', 'player', 'text'],
  ] as const)('on bass, asks %s over %s with %s options, reading chord symbols instead of boxes', (way, stimulus, options) => {
    expect(drillLayoutOf(way, 'bass')).toEqual({ answer: 'choice', stimulus, options })
  })

  it('on bass, answers a numeral by tapping its root on the fretboard', () => {
    expect(drillLayoutOf('numeral_to_chord', 'bass')).toEqual({ answer: 'fretboard_tap' })
  })

  it('has no layout for picking a chart, which has no screen yet', () => {
    expect(drillLayoutOf('numbers_to_chart', 'guitar')).toBeNull()
    expect(drillLayoutOf('numbers_to_chart', 'bass')).toBeNull()
  })
})
