import { describe, expect, it } from 'vitest'

import { drillLayoutOf } from '@/shared/utils/drillLayout'

describe('drillLayoutOf', () => {
  it.each([
    ['numeral_to_chord', 'none', 'chord_box'],
    ['function_to_chord', 'none', 'chord_box'],
    ['chord_to_numeral', 'chord_box', 'text'],
    ['chord_to_function', 'chord_box', 'text'],
    ['chart_to_numbers', 'chart_boxes', 'text'],
    ['numbers_to_chart', 'none', 'chart_boxes'],
    ['cadence_then_chord', 'player', 'text'],
    ['progression_by_number', 'player', 'text'],
  ] as const)('on guitar, asks %s over %s with %s options', (way, stimulus, options) => {
    expect(drillLayoutOf(way, 'guitar')).toEqual({ answer: 'choice', stimulus, options })
  })

  it.each([
    ['numeral_to_chord', 'none', 'chord_symbol'],
    ['function_to_chord', 'none', 'chord_symbol'],
    ['chord_to_numeral', 'chord_symbol', 'text'],
    ['chord_to_function', 'chord_symbol', 'text'],
    ['chart_to_numbers', 'chart_symbols', 'text'],
    ['numbers_to_chart', 'none', 'chart_symbols'],
    ['cadence_then_chord', 'player', 'text'],
    ['progression_by_number', 'player', 'text'],
  ] as const)('on bass, asks %s over %s with %s options, reading chord symbols instead of boxes', (way, stimulus, options) => {
    expect(drillLayoutOf(way, 'bass')).toEqual({ answer: 'choice', stimulus, options })
  })

});
