import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FirstPathBar from '@/features/admin/components/alpha/FirstPathBar.vue'

describe('FirstPathBar', () => {
  it('fills to the share completed, with a mark at the 70% target', () => {
    const wrapper = mount(FirstPathBar, { props: { percent: 61, label: '11 of 18 nodes · 61%' } })

    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('61')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('11 of 18 nodes · 61%')
    expect(wrapper.get('[data-test="first-path-fill"]').attributes('style')).toContain('width: 61%')
    expect(wrapper.get('[data-test="first-path-target"]').attributes('style')).toContain('left: 70%')
  })
})
