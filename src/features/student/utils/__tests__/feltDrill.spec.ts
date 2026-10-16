import { describe, expect, it } from 'vitest'

import { feltDrillKey } from '@/features/student/utils/feltDrill'

describe('feltDrillKey', () => {
  it.each([
    'diatonic_chord:numeral_to_chord',
    'diatonic_chord:chord_to_numeral',
    'chord_function:chord_to_function',
    'chord_function:function_to_chord',
    'chart_progression:chart_to_numbers',
    'chart_progression:numbers_to_chart',
  ])('names the harmony drill %s by what the student did', (template) => {
    expect(feltDrillKey(template)).not.toBe('feltQuestions.drills.other')
  })
})
