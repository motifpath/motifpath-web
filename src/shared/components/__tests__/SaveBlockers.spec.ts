import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SaveBlockers from '@/shared/components/SaveBlockers.vue'

describe('SaveBlockers', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const items = [
    { label: 'Mark at least one option correct', field: 'options' },
    { label: 'Add a skill', field: 'skills' },
  ]

  it('names everything that blocks a save under "Before you can save:"', () => {
    const wrapper = mount(SaveBlockers, { props: { items } })

    expect(wrapper.text()).toContain('Before you can save:')
    expect(wrapper.findAll('[data-test="save-blocker"]').map((item) => item.text())).toEqual([
      'Mark at least one option correct',
      'Add a skill',
    ])
  })

  it('jumps to an item’s field: scrolls it into view and focuses its first control', async () => {
    document.body.innerHTML = '<section data-field="skills"><input id="skills-input" /></section>'
    const field = document.querySelector<HTMLElement>('[data-field="skills"]')!
    field.scrollIntoView = vi.fn()
    const wrapper = mount(SaveBlockers, { props: { items }, attachTo: document.body })

    await wrapper.findAll('[data-test="save-blocker"]')[1]!.trigger('click')

    expect(field.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('skills-input')
  })

  it('scrolls itself into view each time Save is tapped with something missing', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true })
    const wrapper = mount(SaveBlockers, { props: { items, reveal: 0 }, attachTo: document.body })

    await wrapper.setProps({ reveal: 1 })
    await wrapper.setProps({ reveal: 2 })

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView.mock.contexts[0]).toBe(wrapper.get('[data-test="save-blockers"]').element)
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('renders nothing when nothing blocks a save', () => {
    const wrapper = mount(SaveBlockers, { props: { items: [] } })

    expect(wrapper.find('[data-test="save-blockers"]').exists()).toBe(false)
  })

  it('is announced when it appears', () => {
    const wrapper = mount(SaveBlockers, { props: { items } })

    expect(wrapper.get('[data-test="save-blockers"]').attributes('role')).toBe('alert')
  })
})
