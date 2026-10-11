import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramLegend from '@/shared/components/diagram/DiagramLegend.vue'

const entries = [
  { names: { en: 'A minor pentatonic' }, color: null },
  { names: { en: 'C major triad' }, color: '#14B8A6' },
]

describe('DiagramLegend', () => {
  it('names every diagram on the board, never by colour alone', () => {
    const wrapper = mount(DiagramLegend, { props: { entries } })

    const list = wrapper.get('[data-test="diagram-legend"]')
    expect(list.attributes('aria-label')).toBe('Diagrams on this board')
    expect(wrapper.findAll('[data-test="legend-entry"]').map((entry) => entry.text())).toEqual(['A minor pentatonic', 'C major triad'])
  })

  it('shows each diagram’s hue beside its name, the default one in the accent colour', () => {
    const wrapper = mount(DiagramLegend, { props: { entries } })

    const [first, second] = wrapper.findAll('[data-test="legend-swatch"]')
    expect(first!.classes()).toContain('bg-accent')
    expect(second!.attributes('style')).toContain('background-color: rgb(20, 184, 166)')
  })
})
