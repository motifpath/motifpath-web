import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DrillChart from '@/shared/components/DrillChart.vue'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const { G, D, Em, C } = drillVoicings

describe('DrillChart', () => {
  it('reads as a list of its bars, in order', () => {
    const wrapper = mount(DrillChart, { props: { bars: ['G', 'D', 'Em', 'C'].map((symbol) => ({ kind: 'symbol' as const, symbol })), instrument: drillGuitar } })

    const list = wrapper.get('ol')
    expect(list.attributes('aria-label')).toBe('Chart')
    expect(wrapper.findAll('li').map((bar) => bar.text())).toEqual(['G', 'D', 'Em', 'C'])
  })

  it('draws a bar of boxes with no chord name, seen or read aloud: the shape is the question', () => {
    const wrapper = mount(DrillChart, { props: { bars: [G, D, Em, C].map((chord) => ({ kind: 'box' as const, ...chord })), instrument: drillGuitar } })

    const boxes = wrapper.findAll('svg')
    expect(boxes.map((box) => box.attributes('aria-label'))).toEqual(['Bar 1', 'Bar 2', 'Bar 3', 'Bar 4'])
    for (const name of ['G', 'D', 'Em', 'C']) {
      expect(wrapper.findAll('li').some((bar) => bar.text().split(/\s+/).includes(name))).toBe(false)
    }
  })
})
