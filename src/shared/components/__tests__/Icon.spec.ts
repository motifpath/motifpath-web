import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import Icon from '@/shared/components/Icon.vue'

describe('Icon', () => {
  it.each([
    ['completed', 'circle-check'],
    ['current', 'circle-dot'],
    ['locked', 'lock'],
    ['todo', 'circle'],
  ] as const)('renders the %s role as the %s glyph', (name, iconClass) => {
    const wrapper = mount(Icon, { props: { name } })

    expect(wrapper.find(`svg.lucide-${iconClass}`).exists()).toBe(true)
  })

  it('is decorative and hidden from assistive tech when no label is given', () => {
    const wrapper = mount(Icon, { props: { name: 'completed' } })

    const svg = wrapper.get('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('role')).toBeUndefined()
    expect(svg.attributes('aria-label')).toBeUndefined()
  })

  it('exposes an accessible name and img role when a label is given', () => {
    const wrapper = mount(Icon, { props: { name: 'locked', label: 'Locked' } })

    const svg = wrapper.get('svg')
    expect(svg.attributes('aria-hidden')).toBeUndefined()
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('Locked')
  })
})
