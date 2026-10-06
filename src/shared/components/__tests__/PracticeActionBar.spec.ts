import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'

describe('PracticeActionBar', () => {
  it('holds the screen’s action at the bottom, clear of the phone’s home indicator', () => {
    const wrapper = mount(PracticeActionBar, { slots: { default: '<button>Continue</button>' } })

    const bar = wrapper.get('[data-test="action-bar"]')
    expect(bar.text()).toBe('Continue')
    expect(bar.classes()).toEqual(expect.arrayContaining(['fixed', 'bottom-0', 'pb-safe']))
  })
})
