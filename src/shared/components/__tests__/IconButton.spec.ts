import { mount } from '@vue/test-utils'
import { Columns3 } from 'lucide-vue-next'
import { h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import IconButton from '@/shared/components/IconButton.vue'

function mountButton(props: Record<string, unknown> = {}) {
  return mount(IconButton, {
    props: { label: 'Add column', ...props },
    slots: { default: () => h(Columns3, { size: 20 }) },
  })
}

describe('IconButton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('names its action for assistive technology and on hover', () => {
    const button = mountButton().get('button')

    expect(button.attributes('aria-label')).toBe('Add column')
    expect(button.attributes('title')).toBe('Add column')
  })

  it('emits a click when tapped', async () => {
    const wrapper = mountButton()

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('shows its name after a long press, and does not act on that press', async () => {
    const wrapper = mountButton()
    const button = wrapper.get('button')

    await button.trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="icon-button-name"]').text()).toBe('Add column')

    await button.trigger('pointerup')
    await button.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('does not show its name on a short tap', async () => {
    const wrapper = mountButton()
    const button = wrapper.get('button')

    await button.trigger('pointerdown')
    vi.advanceTimersByTime(100)
    await button.trigger('pointerup')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="icon-button-name"]').exists()).toBe(false)
  })

  it('marks a toggled-on action as pressed', () => {
    expect(mountButton({ pressed: true }).get('button').attributes('aria-pressed')).toBe('true')
    expect(mountButton().get('button').attributes('aria-pressed')).toBeUndefined()
  })

  it('cannot be used while disabled', () => {
    expect(mountButton({ disabled: true }).get('button').attributes('disabled')).toBeDefined()
  })
})
