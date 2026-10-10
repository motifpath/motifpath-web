import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StatusChip from '@/shared/components/StatusChip.vue'

describe('StatusChip', () => {
  it('shows its label as text, so the colour never carries the meaning alone', () => {
    const wrapper = mount(StatusChip, { props: { label: '2 fading — refresh them', tone: 'warning' } })

    expect(wrapper.text()).toBe('2 fading — refresh them')
  })

  it('is a status label, not a control', () => {
    const wrapper = mount(StatusChip, { props: { label: 'New' } })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('paints a warning chip in the warning colours and a neutral chip in the quiet ones', () => {
    const warning = mount(StatusChip, { props: { label: '2 fading', tone: 'warning' } })
    const neutral = mount(StatusChip, { props: { label: 'New' } })

    expect(warning.classes()).toEqual(expect.arrayContaining(['bg-warning-muted', 'text-warning']))
    expect(neutral.classes()).toEqual(expect.arrayContaining(['bg-surface-sunken', 'text-ink-muted']))
  })
})
