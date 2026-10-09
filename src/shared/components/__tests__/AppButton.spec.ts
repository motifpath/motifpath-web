import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppButton from '@/shared/components/AppButton.vue'

describe('AppButton', () => {
  it('is a native button with type="button" by default', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Send' } })

    expect(wrapper.get('button').attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Send')
  })

  it.each([
    ['primary', 'bg-accent'],
    ['secondary', 'border-accent'],
    ['tertiary', 'text-accent-text'],
    ['destructive', 'bg-danger'],
  ] as const)('the %s variant is styled as such', (variant, cls) => {
    const wrapper = mount(AppButton, { props: { variant }, slots: { default: 'Go' } })

    expect(wrapper.get('button').classes()).toContain(cls)
  })

  it('is at least 48 px tall, a full touch target', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Go' } })

    expect(wrapper.get('button').classes()).toContain('min-h-12')
  })

  it('draws its focus ring for keyboard focus only', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Go' } })

    expect(wrapper.get('button').classes()).toEqual(
      expect.arrayContaining(['focus-visible:ring-2', 'focus-visible:ring-focus', 'focus-visible:ring-offset-2']),
    )
  })

  describe('while busy', () => {
    it('shows a spinner before its label and says it is busy', () => {
      const wrapper = mount(AppButton, { props: { busy: true }, slots: { default: 'Starting…' } })

      expect(wrapper.find('[data-test="button-spinner"]').exists()).toBe(true)
      expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
      expect(wrapper.text()).toBe('Starting…')
    })

    it('ignores further taps', async () => {
      const wrapper = mount(AppButton, { props: { busy: true }, slots: { default: 'Send' } })

      await wrapper.get('button').trigger('click')

      expect(wrapper.emitted('click')).toBeUndefined()
    })
  })

  it('passes a tap through when it is not busy', async () => {
    const wrapper = mount(AppButton, { slots: { default: 'Send' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('can be a RouterLink with the same look', () => {
    const wrapper = mount(AppButton, {
      props: { to: { name: 'path' } },
      slots: { default: 'Go to my path' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'path' })
    expect(link.classes()).toContain('bg-accent')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('can span the full width, as in a sheet', () => {
    const wrapper = mount(AppButton, { props: { block: true }, slots: { default: 'Send' } })

    expect(wrapper.get('button').classes()).toContain('w-full')
  })
})
