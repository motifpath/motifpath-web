import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import InstrumentIcon from '@/shared/components/InstrumentIcon.vue'

const drawn = (icon: string, family: 'fretted' | 'keyboard') =>
  mount(InstrumentIcon, { props: { icon, family } }).get('svg').attributes('data-icon')

describe('InstrumentIcon', () => {
  it.each(['acoustic_guitar', 'electric_guitar', 'electric_bass', 'piano', 'fretted', 'keyboard'])(
    'draws the %s picture',
    (icon) => {
      expect(drawn(icon, icon === 'piano' || icon === 'keyboard' ? 'keyboard' : 'fretted')).toBe(icon)
    },
  )

  it("draws a key it doesn't know as its family's generic picture", () => {
    expect(drawn('banjo', 'fretted')).toBe('fretted')
    expect(drawn('organ', 'keyboard')).toBe('keyboard')
  })

  it('is decorative, the name beside it says what it is', () => {
    expect(mount(InstrumentIcon, { props: { icon: 'electric_bass', family: 'fretted' } }).get('svg').attributes('aria-hidden')).toBe('true')
  })
})
