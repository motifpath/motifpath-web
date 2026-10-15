import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TempoNoteValueIcon from '@/shared/components/TempoNoteValueIcon.vue'
import { ALL_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'

describe('TempoNoteValueIcon', () => {
  it.each(ALL_NOTE_VALUES)('draws %s in the current text colour, as decoration', (value) => {
    const svg = mount(TempoNoteValueIcon, { props: { value } }).get('svg')

    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('data-note-value')).toBe(value)
    const paths = svg.findAll('path')
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      const paint = [path.attributes('fill'), path.attributes('stroke')].filter((c) => c && c !== 'none')
      expect(paint).not.toHaveLength(0)
      expect(paint.every((c) => c === 'currentColor')).toBe(true)
    }
  })

  it('draws each value differently', () => {
    const drawings = ALL_NOTE_VALUES.map((value) => mount(TempoNoteValueIcon, { props: { value } }).html().replace(/data-note-value="[^"]*"/, ''))
    expect(new Set(drawings).size).toBe(ALL_NOTE_VALUES.length)
  })
})
