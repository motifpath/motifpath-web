import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import BeatDots from '@/shared/components/BeatDots.vue'

const dots = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[data-test="beat-dot"]')

describe('BeatDots', () => {
  it('draws a dot a beat, the downbeat larger so the bar reads without colour', () => {
    const wrapper = mount(BeatDots, { props: { beats: 3, lit: null } })

    expect(dots(wrapper).map((dot) => dot.attributes('data-kind'))).toEqual(['downbeat', 'beat', 'beat'])
    expect(dots(wrapper).every((dot) => dot.attributes('data-lit') === 'false')).toBe(true)
  })

  it('lights the sounding beat', () => {
    const wrapper = mount(BeatDots, { props: { beats: 4, lit: 1 } })

    expect(dots(wrapper).map((dot) => dot.attributes('data-lit'))).toEqual(['false', 'true', 'false', 'false'])
  })
})
