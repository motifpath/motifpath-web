import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const signOut = vi.fn(async () => {})

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ signOut }),
}))

import SignOutLink from '@/shared/components/SignOutLink.vue'
import { i18n } from '@/i18n'

describe('SignOutLink', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('updates its default label reactively when the locale changes', async () => {
    const wrapper = mount(SignOutLink)
    expect(wrapper.text()).toBe('Sign out')

    i18n.global.locale.value = 'pt-BR'
    await nextTick()

    expect(wrapper.text()).toBe('Sair')
  })

  it('shows a default "Sign out" label', () => {
    const wrapper = mount(SignOutLink)

    expect(wrapper.text()).toBe('Sign out')
  })

  it('shows a custom label when given one', () => {
    const wrapper = mount(SignOutLink, { props: { label: 'Sign out and try a different account' } })

    expect(wrapper.text()).toBe('Sign out and try a different account')
  })

  it('calls signOut when clicked', async () => {
    const wrapper = mount(SignOutLink)

    await wrapper.get('[data-test="sign-out"]').trigger('click')

    expect(signOut).toHaveBeenCalledOnce()
  })

  it('merges a parent-supplied class with its own styling', () => {
    const wrapper = mount(SignOutLink, { attrs: { class: 'ml-auto' } })

    const classes = wrapper.get('[data-test="sign-out"]').classes()
    expect(classes).toContain('ml-auto')
    expect(classes).toContain('text-ink-muted')
  })
})
